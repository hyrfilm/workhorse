import { defaultOptions } from './config';
import { defaultFactories } from '@/defaultFactories.ts';

import {
  CommandDispatcher,
  Factories,
  Payload,
  PollOptions,
  QueueStatus,
  RunTask,
  SingleTaskExecutor,
  TaskQueue,
  Workhorse,
  WorkhorseConfig,
} from './types';
import { createDispatcher } from './dispatcher';
import { createPeriodicJob, PeriodicJob } from '@/util/periodic.ts';
import { log, error, setLogLevel } from '@/util/logging.ts';
import { createPluginHandler, PluginHandler } from '@/pluginHandler.ts';
import { aw } from 'vitest/dist/chunks/reporters.D7Jzd9GS.js';

type RuntimeConfig = [TaskQueue, CommandDispatcher, PeriodicJob, PluginHandler];

const initialize = async (runTask: RunTask, config: WorkhorseConfig, factories: Factories): Promise<RuntimeConfig> => {

  setLogLevel(config.logLevel);
  const database = await factories.createDatabase(config);
  const taskQueue = factories.createTaskQueue(config, database);
  const taskExecutors: SingleTaskExecutor[] = [];
  for (let i = 0; i < config.concurrency; i++) {
    const taskHooks = factories.createExecutorHooks(config, taskQueue, runTask);
    const executor = factories.createTaskExecutor(config, taskHooks);
    taskExecutors.push(executor);
  }
  const executorPool = factories.createExecutorPool(config, taskExecutors);
  const dispatcher = createDispatcher(taskQueue, executorPool);
  const poller = async () => {
    await dispatcher.poll();
    const status = await dispatcher.getStatus();
    // TODO: This should be configurable
    if (status.queued === 0 && status.failed > 0) {
      await dispatcher.requeue();
    }
  };
  const pollingJob = createPeriodicJob(poller, config.poll.interval);

  if (config.poll.auto) {
    pollingJob.start();
  }

  config.plugins.forEach((plugin) => {
    plugin.onStart(dispatcher);
  });

  const pluginHandler = createPluginHandler();

  return [taskQueue, dispatcher, pollingJob, pluginHandler];
};

const createWorkhorse = async (
  run: RunTask,
  options: Partial<WorkhorseConfig> = {},
  factories: Partial<Factories> = {}
): Promise<Workhorse> => {
  const runtimeConfig = {
    options: { ...defaultOptions(), ...options },
    factories: { ...defaultFactories(), ...factories },
  };
  const result = await initialize(
    run,
    runtimeConfig.options,
    runtimeConfig.factories
  );
  const [taskQueue, dispatcher, poller, pluginHandler] = result;

  const workhorse: Workhorse = {
    queue: async (taskId: string, payload: Payload) => {
      await taskQueue.addTask(taskId, payload);
    },
    getStatus: async () => {
      return await taskQueue.getStatus();
    },
    getTaskResult: async (taskId: string): Promise<Payload|undefined> => {
      return await taskQueue.getTaskResult(taskId);
    },
    startPoller: (_pollOptions?: PollOptions) => {
      poller.start();
    },
    stopPoller: () => {
      poller.stop();
    },
    poll: async () => {
      await dispatcher.poll();
    },
    requeue: async () => {
      await dispatcher.requeue();
    },
    shutdown: async (): Promise<QueueStatus> => {
      poller.stop();
      return await dispatcher.shutdown();
      pluginHandler.stopPlugins();
    },
  };

  await dispatcher.startExecutors();

  try {
    pluginHandler.startPlugins(runtimeConfig.options, dispatcher);
  } catch(e) {
    error('An exception occurred when starting plugins.')
    if (e instanceof Error) {
      error(e.message);
      error(e.stack);
    }
    throw new Error('Failed to start');
  }

  return workhorse;
};

export { createWorkhorse };

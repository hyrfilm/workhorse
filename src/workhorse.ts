import { defaultOptions } from './config';
import { defaultFactories } from '@/defaultFactories.ts';

import {
  CommandDispatcher,
  Factories,
  Payload,
  QueueStatus,
  RunTask,
  SingleTaskExecutor,
  TaskQueue,
  Workhorse,
  WorkhorseConfig,
} from '@types';
import { createDispatcher } from './dispatcher';
import { createPeriodicJob, PeriodicJob } from '@/util/periodic.ts';
import { error, setLogLevel } from '@/util/logging.ts';
import { createPluginHandler, PluginHandler } from '@/pluginHandler.ts';
import { Emitter, waitForReturnValue } from '@events';
import { SubscriptionEvents, WorkhorseEventMap } from '@/events/eventTypes.ts';
import { TaskMonitor } from '@/plugins/TaskMonitor.ts';

type RuntimeConfig = [TaskQueue, CommandDispatcher, PeriodicJob, PluginHandler];

const initialize = async (
  runTask: RunTask,
  config: WorkhorseConfig,
  factories: Factories
): Promise<RuntimeConfig> => {
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

  const pluginHandler = createPluginHandler();
  pluginHandler.startPlugins(config);

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
    plugins: [new TaskMonitor()],
  };
  const result = await initialize(run, runtimeConfig.options, runtimeConfig.factories);
  const [taskQueue, dispatcher, poller, pluginHandler] = result;

  const workhorse: Workhorse = {
    subscribe<K extends SubscriptionEvents>(
      event: K,
      handler: (payload: WorkhorseEventMap[K]) => void
    ): () => void {
      Emitter.on(event, handler);
      return () => {
        Emitter.off(event, handler);
      };
    },
    queue: async (taskId: string, payload: Payload) => {
      await taskQueue.addTask(taskId, payload);
    },
    run: async (taskId: string, payload: Payload): Promise<unknown> => {
      const resultPromise = waitForReturnValue(taskId);
      await workhorse.queue(taskId, payload);
      //TODO: Use a better way of handling non-awaits
      workhorse.poll().catch(error);
      return resultPromise;
    },
    getStatus: async () => {
      return await taskQueue.getStatus();
    },
    startPoller: () => {
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
      pluginHandler.stopPlugins();
      return await dispatcher.shutdown();
    },
  };

  await dispatcher.startExecutors();
  return workhorse;
};

export { createWorkhorse };

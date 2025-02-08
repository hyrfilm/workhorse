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
import { setLogLevel } from '@/util/logging.ts';

type RuntimeConfig = [TaskQueue, CommandDispatcher, PeriodicJob];

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

  return [taskQueue, dispatcher, pollingJob];
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
  const [taskQueue, dispatcher, poller] = result;

  const workhorse: Workhorse = {
    queue: async (taskId: string, payload: Payload) => {
      await taskQueue.addTask(taskId, payload);
    },
    getStatus: async () => {
      return await taskQueue.getStatus();
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
    },
  };

  await dispatcher.startExecutors();

  return workhorse;
};

export { createWorkhorse };

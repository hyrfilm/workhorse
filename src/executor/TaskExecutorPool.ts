import {
  TaskExecutorStrategy,
  SingleTaskExecutor,
  TaskExecutorPool,
  Inspector,
  WorkhorseConfig,
} from '@/types.ts';
import { UnreachableError } from '@/errors.ts';

interface PollStrategies {
  pollSerial(): Promise<void>;
  pollParallel(): Promise<void>;
  pollDetached(): Promise<void>;
}

const createExecutorPool = (
  config: WorkhorseConfig,
  taskExecutors: SingleTaskExecutor[],
  _inspect?: Inspector
): TaskExecutorPool => {
  let executors = [...taskExecutors];

  // TODO: This is too messy, split into pool / polling!?
  const executorPool: TaskExecutorPool & PollStrategies = {
    pollSerial: async () => {
      for (const executor of executors) {
        const preWait = config.poll.pre.wait;
        await executor.waitFor(preWait);
        executor.poll();
      }
    },
    pollParallel: async () => {
      const tasks: Promise<void>[] = [];

      for (const executor of executors) {
        if (executor.getStatus() === 'started') {
          const preWait = config.poll.pre.wait;
          //TODO: Instead of `await executor.waitFor(preWait)`, push the promise
          tasks.push(
            executor.waitFor(preWait).then(() => {
              executor.poll();
            })
          );
        }
      }
      await Promise.all(tasks);
    },
    pollDetached: () => {
      for (const executor of executors) {
        if (executor.getStatus() === 'started') {
          executor.poll();
        }
      }
      return Promise.resolve();
    },

    startAll: async () => {
      for (const executor of executors) {
        executor.start();
      }
      for (const executor of executors) {
        await executor.waitFor('ready');
      }
    },
    stopAll: async () => {
      for (const executor of executors) {
        await executor.waitFor('canStop');
        executor.stop();
      }
      for (const executor of executors) {
        await executor.waitFor('stopped');
      }
    },
    shutdown: async () => {
      await executorPool.stopAll();
      executors = [];
    },
    pollAll: async () => {
      switch (config.taskExecution) {
        case TaskExecutorStrategy.SERIAL:
          return executorPool.pollSerial();
        case TaskExecutorStrategy.PARALLEL:
          return executorPool.pollParallel();
        case TaskExecutorStrategy.DETACHED:
          return executorPool.pollDetached();
        default:
          throw new UnreachableError(
            config.taskExecution,
            `Unrecognized poll strategy: ${config.taskExecution}`
          );
      }
    },
  } as const;

  return executorPool;
};

export { createExecutorPool };

import {
    TaskExecutorStrategy,
    RunTask,
    SingleTaskExecutor,
    TaskExecutorPool,
    TaskQueue,
    WorkhorseConfig,
    Inspector
} from "@/types.ts";
import {UnreachableError} from "@/errors.ts";

const createExecutorPool = (config: WorkhorseConfig, taskQueue: TaskQueue, run: RunTask, inspect: Inspector): TaskExecutorPool => {
    let executors: SingleTaskExecutor[] = [];
    for (let i = 0; i < config.concurrency; i++) {
        const taskRunner = config.factories.createHooks(config, taskQueue, run);
        const executor = config.factories.createTaskExecutor(config, taskRunner, inspect);
        executors.push(executor);
    }

    const executorPool = {
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

            for (const executor of executors) {
                executor.stop();
                executors = [];
            }
        },
        pollAll: async() => {
            switch(config.taskExecution) {
                case TaskExecutorStrategy.SERIAL:
                    return executorPool.pollSerial();
                case TaskExecutorStrategy.PARALLEL:
                    return executorPool.pollParallel();
                case TaskExecutorStrategy.DETACHED:
                    return executorPool.pollNoWait();
                default:
                    throw new UnreachableError(config.taskExecution as never, `Unrecognized poll strategy: ${config.taskExecution}`);
            }
        },
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
                    // Instead of `await executor.waitFor(preWait)`, push the promise
                    tasks.push(
                        executor.waitFor(preWait).then(() => executor.poll())
                    );
                }
            }
            await Promise.all(tasks);
        },
        pollNoWait: () => {
            for (const executor of executors) {
                if (executor.getStatus() === 'started') {
                    executor.poll();
                }
            }
            return Promise.resolve();
        },
    }

    return executorPool;
}

export { createExecutorPool };

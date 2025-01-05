import {
    RunTask,
    SingleTaskExecutor,
    TaskExecutorPool,
    TaskQueue,
    WorkhorseConfig
} from "@/types.ts";

const createExecutorPool = (config: WorkhorseConfig, taskQueue: TaskQueue, run: RunTask): TaskExecutorPool => {
    let executors: SingleTaskExecutor[] = [];
    for (let i = 0; i < config.concurrency; i++) {
        const taskRunner = config.factories.createTaskRunner(config, taskQueue, run);
        const executor = config.factories.createTaskExecutor(config, taskRunner)
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
        pollAll: async () => {
            for (const executor of executors) {
                const preWait = config.poll.pre.wait;
                await executor.waitFor(preWait);
                executor.poll();
            }
        },
    }

    return executorPool;
}

export { createExecutorPool };

import { config } from "./config";
import { createDatabase } from "./db/createDatabase";
import { createTaskQueue } from "./db/TaskQueue";
import { createTaskExecutor } from "./machines/TaskExecutorMachine";
import { createTaskRunner } from "./TaskRunner";
import {
    DefaultWorkhorseConfig,
    Payload,
    QueueStatus,
    RunTask,
    SingleTaskExecutor, TaskExecutorPool,
    TaskQueue,
    TaskRunner,
} from "./types";

interface Workhorse {
    addTaskSync: (taskId: string, payload: Payload) => void;
    addTask: (taskId: string, payload: Payload) => Promise<void>;
    getStatus: () => Promise<QueueStatus>;
    poll: () => Promise<void>;
    start: () => Promise<void>;
    stop: () => Promise<void>;
}

const getDefaultConfig = () : DefaultWorkhorseConfig => {
    const defaultConfig = structuredClone(config);
    
    defaultConfig.factories.createDatabase = createDatabase;
    defaultConfig.factories.createTaskQueue = createTaskQueue;
    defaultConfig.factories.createTaskRunner = createTaskRunner;
    defaultConfig.factories.createTaskExecutor = createTaskExecutor;

    return defaultConfig as DefaultWorkhorseConfig;
}

const createTaskExecutorPool = (config: DefaultWorkhorseConfig, taskQueue: TaskQueue, run: RunTask): TaskExecutorPool => {
    const executors: SingleTaskExecutor[] = [];
    for (let i=0; i<config.concurrency;i++) {
        const taskRunner = config.factories.createTaskRunner(config, taskQueue, run);
        const executor = config.factories.createTaskExecutor(config, taskRunner)
        executors.push(executor);
    }

    return {
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
        pollAll: async () => {
            for (const executor of executors) {
                const preWait = config.poll.pre.wait;
                const postWait = config.poll.post.wait;

                await executor.waitFor(preWait);
                executor.poll();
                if (postWait==='none') {
                    continue;
                } else if (postWait==='busy') {
                    await executor.waitIf('busy');
                    //await executor.waitIf(postWait);
                } else if (postWait==='executing') {
                    await executor.waitIf('busy');
                    await executor.waitIf('executing');
                } else if (postWait==='ready') {
                    await executor.waitFor('ready');
                } else {
                    const message : never = `Unknown postWait: ${postWait}` as never;
                    throw Error(message);
                }
            }
        },
    }
}

const createWorkhorse = async (run: RunTask) : Promise<Workhorse> => {
    const config = getDefaultConfig();
    const runQuery = await config.factories.createDatabase(config);
    const taskQueue =  config.factories.createTaskQueue(config, runQuery);
    const taskExecutors = createTaskExecutorPool(config, taskQueue, run);

    //TODO: Add some good way to inspect / diagnose stuff
    //taskExecutor.subscribe((snapshot) => log.info(snapshot.value));

    const workhorse = {
        addTaskSync: (identity: string, payload: Payload) => {
            workhorse.addTask(identity, payload)
                .then(() => {})
                .catch((e) => { throw new Error(e)});
        },
        addTask: async (identity: string, payload: Payload) => {
            await taskQueue.addTask(identity, payload);
        },
        getStatus: async() => {
            return await taskQueue.getStatus();
        },
        start: async() => {
            await taskExecutors.startAll();
        },
        poll: async() => {
            await taskExecutors.pollAll();
        },
        stop: async() => {
            await taskExecutors.stopAll();
        }
    }

    await workhorse.start();

    return workhorse;
}

export { createWorkhorse, config as workhorseConfig };
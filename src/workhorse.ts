import { config, getDefaultConfig } from "./config";
import { createDatabase } from "./db/createDatabase";
import { createTaskQueue } from "./db/TaskQueue";
import { createTaskExecutor } from "./machines/TaskExecutorMachine";
import { createTaskRunner } from "./TaskRunner";
import { DefaultWorkhorseConfig, Payload, QueueStatus, RunTask, WorkhorseConfig } from "./types";

interface Workhorse {
    addTask: (taskId: string, payload: Payload) => Promise<void>;
    getStatus: () => Promise<QueueStatus>;
    poll: () => Promise<void>;
    start: () => Promise<void>;
}

const getDefaultConfig = () : DefaultWorkhorseConfig => {
    const defaultConfig = structuredClone(config);
    
    defaultConfig.factories.createDatabase = createDatabase;
    defaultConfig.factories.createTaskQueue = createTaskQueue;
    defaultConfig.factories.createTaskRunner = createTaskRunner;
    defaultConfig.factories.createTaskExecutor = createTaskExecutor;

    return defaultConfig as DefaultWorkhorseConfig;
}

const createWorkhorse = async (run: RunTask) : Promise<Workhorse> => {
    const config = getDefaultConfig();
    const runQuery = await config.factories.createDatabase(config);
    const taskQueue =  config.factories.createTaskQueue(config, runQuery);
    const taskRunner = config.factories.createTaskRunner(config, taskQueue, run);
    const taskExecutor = config.factories.createTaskExecutor(config, taskRunner);

    //TODO: Add some good way to inspect / diagnose stuff
    //taskExecutor.subscribe((snapshot) => log.info(snapshot.value));

    const workhorse = {
        addTask: async (identity: string, payload: Payload) => {
            await taskQueue.addTask(identity, payload);
        },
        getStatus: async() => {
            return await taskQueue.getStatus();
        },
        start: async() => {
            taskExecutor.start();
            await taskExecutor.waitFor('ready');
        },
        poll: async() => {
            await taskExecutor.waitFor('ready');
            taskExecutor.poll();
        },
        stop: async() => {
            await taskExecutor.waitFor('canStop');
            taskExecutor.stop();
            await taskExecutor.waitFor('stopped');
        }
    }

    await workhorse.start();

    return workhorse;
}

export { createWorkhorse, config as workhorseConfig };
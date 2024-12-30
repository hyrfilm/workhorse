import {getDefaultConfig} from "./config";
import {Payload, QueueStatus, RunTask, Workhorse, WorkhorseConfig} from "./types";
import * as errors from "./errors";
import {createTaskRunner} from "@/TaskRunner.ts";
import {createDatabase} from "@/db/createDatabase.ts";
import {createTaskExecutor} from "@/machines/TaskExecutorMachine.ts";
import {createTaskQueue} from "@/db/TaskQueue.ts";
import {createExecutorPool} from "@/ExecutorPool.ts";

const createConfig = (): WorkhorseConfig => {
    const config = getDefaultConfig();
    config.factories = {
        createDatabase: createDatabase,
        createTaskQueue: createTaskQueue,
        createTaskRunner: createTaskRunner,
        createTaskExecutor: createTaskExecutor,
        createExecutorPool: createExecutorPool,
    };
    return config;
}

const createWorkhorse = async (run: RunTask) : Promise<Workhorse> => {
    const config = createConfig();

    const runQuery = await config.factories.createDatabase(config);
    const taskQueue = config.factories.createTaskQueue(config, runQuery);
    const executorPool = config.factories.createExecutorPool(config, taskQueue, run);

    //TODO: Add some good way to inspect / diagnose stuff
    //taskExecutor.subscribe((snapshot) => log.info(snapshot.value));

    let workhorse = {
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
            await executorPool.startAll();
        },
        poll: async() => {
            await executorPool.pollAll();
        },
        stop: async() => {
            await executorPool.stopAll();
        },
        shutdown: async(): Promise<QueueStatus> => {
            const finalStatus = await workhorse.getStatus();
            await executorPool.shutdown();
            workhorse = errors.deadHorse;
            return finalStatus;     
        },
    }

    await workhorse.start();
    return workhorse;
}

export { createWorkhorse };
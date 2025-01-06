import {getDefaultConfig} from "./config";
import {Payload, QueueStatus, RunTask, Workhorse, WorkhorseConfig} from "./types";
import * as errors from "./errors";
import {createTaskRunner} from "@/TaskRunner.ts";
import {createDatabase} from "@/db/createDatabase.ts";
import {createTaskExecutor} from "@/machines/TaskExecutorMachine.ts";
import {createTaskQueue} from "@/db/TaskQueue.ts";
import {createExecutorPool} from "@/ExecutorPool.ts";

const createDefaultConfig = (): WorkhorseConfig => {
    const defaultConfig = getDefaultConfig();
    defaultConfig.factories = {
        createDatabase: createDatabase,
        createTaskQueue: createTaskQueue,
        createTaskRunner: createTaskRunner,
        createTaskExecutor: createTaskExecutor,
        createExecutorPool: createExecutorPool,
    };
    return defaultConfig;
}

const createWorkhorse = async (run: RunTask, config?: Partial<WorkhorseConfig>) : Promise<Workhorse> => {
    const cfg = { ...createDefaultConfig(), ...config };

    const runQuery = await cfg.factories.createDatabase(cfg);
    const taskQueue = cfg.factories.createTaskQueue(cfg, runQuery);
    const executorPool = cfg.factories.createExecutorPool(cfg, taskQueue, run);

    //TODO: Add some good way to inspect / diagnose stuff
    //taskExecutor.subscribe((snapshot) => log.info(snapshot.value));

    let workhorse = {
        queue: async(taskId:string, payload: Payload) => {
            await taskQueue.addTask(taskId, payload);
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
        requeue: async() => {
            await taskQueue.requeue();
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
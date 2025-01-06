import {getDefaultConfig} from "./config";
import {Payload, QueueStatus, RunTask, Workhorse, WorkhorseConfig} from "./types";
import {createTaskRunner} from "@/TaskRunner.ts";
import {createDatabase} from "@/db/createDatabase.ts";
import {createTaskExecutor} from "@/machines/TaskExecutorMachine.ts";
import {createTaskQueue} from "@/db/TaskQueue.ts";
import {createExecutorPool} from "@/ExecutorPool.ts";
import {WorkhorseShutdownError} from "./errors";
import log from "loglevel";

log.setDefaultLevel(log.levels.INFO);

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

const createWorkhorse = async (run: RunTask, options?: Partial<WorkhorseConfig>): Promise<Workhorse> => {
    const config = { ...createDefaultConfig(), ...options };

    const runQuery = await config.factories.createDatabase(config);
    const taskQueue = config.factories.createTaskQueue(config, runQuery);
    const executorPool = config.factories.createExecutorPool(config, taskQueue, run);

    // Internal status field to track lifecycle
    let status: 'active' | 'shutdown' = 'active';

    const ensureActive = () => {
        if (status === 'shutdown') {
            throw new WorkhorseShutdownError("This Workhorse instance has been shut down and is no longer available.");
        }
    };

    const workhorse: Workhorse = {
        queue: async (taskId: string, payload: Payload) => {
            ensureActive();
            await taskQueue.addTask(taskId, payload);
        },
        getStatus: async () => {
            ensureActive();
            return await taskQueue.getStatus();
        },
        start: async () => {
            ensureActive();
            await executorPool.startAll();
        },
        poll: async () => {
            ensureActive();
            await executorPool.pollAll();
        },
        pollNoWait: () => {
            executorPool.pollAllNoWait();
        },
        requeue: async () => {
            ensureActive();
            await taskQueue.requeue();
        },
        stop: async () => {
            ensureActive();
            await executorPool.stopAll();
        },
        shutdown: async (): Promise<QueueStatus> => {
            ensureActive();
            const finalStatus = await taskQueue.getStatus();
            await executorPool.shutdown();
            status = 'shutdown';
            return finalStatus;
        },
    };

    // Automatically start the Workhorse when created
    await workhorse.start();
    return workhorse;
};


export { createWorkhorse };
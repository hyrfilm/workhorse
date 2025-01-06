import {getDefaultConfig} from "./config";
import {Payload, QueueStatus, RunTask, Workhorse, WorkhorseConfig} from "./types";
import {createDatabase} from "@/queue/db/createDatabase";
import {createTaskQueue} from "@/queue/TaskQueue";
import {createTaskHooks} from "@/executor/TaskHooks";
import {createTaskExecutor} from "@/executor/TaskExecutor";
import {createExecutorPool} from "@/executor/TaskExecutorPool";
import {WorkhorseShutdownError} from "@/errors";
import log from "loglevel";

log.setDefaultLevel(log.levels.INFO);

const createDefaultConfig = (): WorkhorseConfig => {
    const defaultConfig = getDefaultConfig();
    defaultConfig.factories = {
        createDatabase: createDatabase,
        createTaskQueue: createTaskQueue,
        createHooks: createTaskHooks,
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
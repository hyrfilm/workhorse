import {getDefaultConfig} from "./config";
import {
    Payload,
    QueueStatus,
    RunTask,
    Workhorse,
    WorkhorseConfig
} from "./types";
import {createDatabase} from "@/queue/db/createDatabase";
import {createTaskQueue} from "@/queue/TaskQueue";
import {createTaskHooks} from "@/executor/TaskHooks";
import {createTaskExecutor} from "@/executor/TaskExecutor";
import {createExecutorPool} from "@/executor/TaskExecutorPool";
import log from "loglevel";
import { createCommandDispatcher } from "./Commando2";

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

    const disptacher = createCommandDispatcher(taskQueue, executorPool);

    const workhorse: Workhorse = {
        queue: async (taskId: string, payload: Payload) => {
            await disptacher.queue(taskId, payload);
        },
        getStatus: async () => {
            return await disptacher.getStatus();
        },
        startPoller: async () => {            
        },
        stopPoller: async () => {
        },
        poll: async () => {
            await disptacher.poll();
        },
        requeue: async () => {
            await disptacher.requeue();
        },
        shutdown: async (): Promise<QueueStatus> => {
            return await disptacher.getStatus();
        },
    };
/*
    async function pollAndRequeue (opts: PollOptions = { pollInterval: seconds(0.25), requeuing: RequeueStrategy.DEFERRED}) : Promise<void> {
        while (isPolling) {
            await executorPool.pollAll();
            const status = await taskQueue.getStatus();

            if (opts.requeuing == RequeueStrategy.DEFERRED) {
                if (status.queued === 0 && status.failed > 0) {
                    await workhorse.requeue();
                }
            } else if (opts.requeuing == RequeueStrategy.IMMEDIATE) {
                if (status.failed) {
                    await workhorse.requeue();
                }
            } else {
                throw new UnreachableError(opts.requeuing as never, 'Unexpected requeue');
            }

            setTimeout((opts) => { pollAndRequeue(opts) }, opts.pollInterval);
            return Promise.resolve();
        }
    }
*/
    // TODO: Rename to 'resume' or 'enable'
    return workhorse;
};


export { createWorkhorse };
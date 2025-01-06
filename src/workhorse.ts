import {getDefaultConfig} from "./config";
import {
    Payload,
    PollOptions,
    QueueStatus,
    RequeueStrategy,
    RunTask,
    Workhorse,
    WorkhorseConfig
} from "./types";
import {createDatabase} from "@/queue/db/createDatabase";
import {createTaskQueue} from "@/queue/TaskQueue";
import {createTaskHooks} from "@/executor/TaskHooks";
import {createTaskExecutor} from "@/executor/TaskExecutor";
import {createExecutorPool} from "@/executor/TaskExecutorPool";
import {UnreachableError, WorkhorseShutdownError} from "@/errors";
import log from "loglevel";
import {seconds} from "@/util/time.ts";

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
    import('@/xstate/inspect')

    const config = { ...createDefaultConfig(), ...options };

    const runQuery = await config.factories.createDatabase(config);
    const taskQueue = config.factories.createTaskQueue(config, runQuery);
    const executorPool = config.factories.createExecutorPool(config, taskQueue, run);

    // TODO: This object should probably be a state machine
    // Internal status field to track lifecycle
    let status: 'active' | 'shutdown' = 'active';
    let isPolling: boolean = false;

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
            //workhorseStatus.update(await taskQueue.getStatus())
            return await taskQueue.getStatus();
        },
        startPoller: async () => {
            ensureActive();
            if (isPolling) {
                return;
            } else {
                isPolling = true;
            }

            await workhorse.start();
            await pollAndRequeue();
        },
        stopPoller: async () => {
            ensureActive();
            if (!isPolling) {
                return;
            } else {
                isPolling = false;
            }

            await workhorse.stop();

        },
        //TODO: Rename to 'resume' or 'enable'
        start: async () => {
            ensureActive();
            await executorPool.startAll();
        },
        //TODO: Rename to 'pause' or 'disable'
        stop: async () => {
            ensureActive();
            await executorPool.stopAll();
        },
        poll: async () => {
            ensureActive();
            await executorPool.pollAll();
        },
        requeue: async () => {
            ensureActive();
            await taskQueue.requeue();
        },
        shutdown: async (): Promise<QueueStatus> => {
            ensureActive();
            const finalStatus = await taskQueue.getStatus();
            await executorPool.shutdown();
            status = 'shutdown';
            return finalStatus;
        },
    };

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

    // TODO: Rename to 'resume' or 'enable'
    await workhorse.start();
    return workhorse;
};


export { createWorkhorse };
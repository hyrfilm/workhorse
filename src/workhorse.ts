import {getDefaultConfig} from "./config";
import {
    Payload, PollOptions,
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
import { createDispatcher } from "./dispatcher";
import {createPeriodicJob } from "@/util/periodic.ts";
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
    const dispatcher = createDispatcher(taskQueue, executorPool);
    const poller = async() => {
        await dispatcher.poll();
        const status = await dispatcher.getStatus();
        if (status.queued===0 && status.failed>0) {
            await dispatcher.requeue();
        }
    }
    let pollingTask = createPeriodicJob(poller, config.poll.interval);

    const workhorse: Workhorse = {
        queue: async (taskId: string, payload: Payload) => {
            await taskQueue.addTask(taskId, payload);
        },
        getStatus: async () => {
            return await taskQueue.getStatus();
        },
        startPoller: (_pollOptions?: PollOptions) => {
            pollingTask.start();
        },
        stopPoller: () => {
            pollingTask.stop();
        },
        poll: async () => {
          await dispatcher.poll();
        },
        requeue: async () => {
          await dispatcher.requeue();
        },
        shutdown: async (): Promise<QueueStatus> => {
          //TODO:
          return await dispatcher.getStatus();
        },
    };

    await dispatcher.startExecutors();
    if (config.poll.auto) {
        workhorse.startPoller();
    }

    return workhorse;
}

export { createWorkhorse };
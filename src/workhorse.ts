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
//import { fromCallback, createActor } from "xstate";
import { createDispatcher } from "./dispatcher";
log.setDefaultLevel(log.levels.INFO);
/*
const callback = fromCallback(({ }) => {
    log.debug('rootActor - starting.')
    // Cleanup function
    return () => {
        log.debug('rootActor - starting.')
    };
});

const rootActor = createActor(callback, {
  inspect: (inspectionEvent) => {
    if (inspectionEvent.type === '@xstate.actor') {
      console.log(inspectionEvent.actorRef);
    }

    if (inspectionEvent.type === '@xstate.event') {
      console.log(inspectionEvent.sourceRef);
      console.log(inspectionEvent.actorRef);
      console.log(inspectionEvent.event);
    }

    if (inspectionEvent.type === '@xstate.snapshot') {
      console.log(inspectionEvent.actorRef);
      console.log(inspectionEvent.event);
      console.log(inspectionEvent.snapshot);
    }
  }
});

const inspect = rootActor.options.inspect;
*/
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
    //rootActor.start();

    const config = { ...createDefaultConfig(), ...options };

    const runQuery = await config.factories.createDatabase(config);
    const taskQueue = config.factories.createTaskQueue(config, runQuery);
    const executorPool = config.factories.createExecutorPool(config, taskQueue, run, undefined);
    const dispatcher = createDispatcher(taskQueue, executorPool, undefined);

    const workhorse: Workhorse = {
        queue: async (taskId: string, payload: Payload) => {
            await taskQueue.addTask(taskId, payload);
        },
        getStatus: async () => {
            //workhorseStatus.update(await taskQueue.getStatus())
            return await taskQueue.getStatus();
        },
        startPoller: async () => {
        },
        stopPoller: async () => {
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

    return workhorse;
}

export { createWorkhorse };
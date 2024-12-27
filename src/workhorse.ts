import {createDatabase} from "@/db/createDatabase";
import {createTaskQueue} from "@/db/TaskQueue.ts";
import {WorkhorseConfig, Payload, RunTask, TaskState} from "@/types";
import {createTaskExecutor} from "@/machines/TaskExecutorMachine";
import {waitFor} from "xstate";
import {minutes, seconds} from "@/util/time";
import {createTaskRunner} from "@/TaskRunner";
import log from "loglevel";

const workhorseConfig: WorkhorseConfig = {
    backoff: {
        initial: seconds(0.5),
        multiplier: 2.5,
        maxTime: minutes(15),
    }
};

interface WorkhorseStatus {
    queued: number,
    successful: number,
    failed: number,
}

interface Workhorse {
    addTask: (taskId: string, payload: Payload) => Promise<void>;
    getStatus: () => Promise<WorkhorseStatus>;
    poll: () => Promise<void>;
    start: () => Promise<void>;
}

const createWorkhorse = async (run: RunTask) : Promise<Workhorse> => {
    log.info('config: ', workhorseConfig);

    const sqlExecutor = await createDatabase();
    const taskQueue =  createTaskQueue(sqlExecutor);
    const taskRunner = createTaskRunner(taskQueue, run);
    const taskExecutor = createTaskExecutor(taskRunner, workhorseConfig);

    //TODO: Add some good way to inspect / diagnose stuff
    //taskExecutor.subscribe((snapshot) => log.info(snapshot.value));

    const workhorse = {
        addTask: (identity: string, payload: Payload) => {
            return taskQueue.addTask(identity, payload);
        },
        getStatus: async() => {
            return {
                queued: await taskQueue.countStatus(TaskState.queued),
                //TODO: executing
                successful: await taskQueue.countStatus(TaskState.successful),
                failed: await taskQueue.countStatus(TaskState.failed),
            }
        },
        start: async() => {
            taskExecutor.send({ type: 'start' });
            await waitFor(taskExecutor, (state) => state.hasTag('ready'));
        },
        poll: async() => {
            await waitFor(taskExecutor, (state) => state.hasTag('ready'));
            taskExecutor.send( { type: 'poll' });
        }
    }

    return workhorse;
}

export { createWorkhorse, workhorseConfig };
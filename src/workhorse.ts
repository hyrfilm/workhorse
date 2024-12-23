import { createDatabase } from "./db/createDatabase";
import { createTaskQueue } from "./db/createTaskQueue";
import { TaskConsumer, TaskProducer, TaskState } from "./db/types";
import { taskExecutorMachine } from "./machines/TaskExecutorMachine";
import { createActor } from "xstate";

interface Workhorse extends TaskProducer {
    numTasksQueued: () => Promise<number>;
    numTasksSuccessful: () => Promise<number>;
    numTasksFailed: () => Promise<number>;
}

const createWorkhorse = async () : Promise<Workhorse> => {
    const sqlExecutor = await createDatabase();
    const taskQueue = await createTaskQueue(sqlExecutor);
    const taskExecutor = createActor(taskExecutorMachine.provide({}));

    const workhorse = {
        addTask: (identity: string, payload: string) => {
            return taskQueue.addTask(identity, payload);
        },
        numTasksQueued: async () => {
            return await taskQueue.countStatus(TaskState.queued);
        },
        numTasksSuccessful: async () => {
            return await taskQueue.countStatus(TaskState.successful);
        },
        numTasksFailed: async () => {
            return await taskQueue.countStatus(TaskState.failed);
        }
    }

    return workhorse;
}

export { createWorkhorse };
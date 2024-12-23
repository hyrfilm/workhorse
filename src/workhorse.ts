import { createDatabase } from "./db/createDatabase";
import { createTaskQueue } from "./db/createTaskQueue";
import { TaskConsumer, TaskProducer, TaskRow, TaskState } from "./db/types";
import { taskExecutorMachine } from "./machines/TaskExecutorMachine";
import { createActor, fromPromise, waitFor } from "xstate";

interface WorkhorseStatus {
    queued: number,
    successful: number,
    failed: number,
}
interface Workhorse extends TaskProducer {
    getStatus: () => Promise<WorkhorseStatus>;
    poll: () => Promise<void>;
}

const createTaskRunner = (queue: TaskConsumer) => {
    let task: undefined | TaskRow = undefined;
    return {
        reserveHook: async (): Promise<void> => {
            console.log(`Reserving task...`);
            task = await queue.reserveTask();
            if (!task) {
                console.log('No reservation');
                throw new Error('No reservation');
            } else {
                console.log(`Reserved task: ${JSON.stringify(task)}`);
            }
        },
        exeuteHook: async (): Promise<void> => {
            console.log(`Executing ${JSON.stringify(task)}`);
        },
        sucessHook: async (): Promise<void> => {
            if (task?.taskId) {
                console.log(`Succesful ${JSON.stringify(task)}`)
                await queue.taskSuccessful(task.taskId);
            } else {
                throw Error(`No taskId: ${JSON.stringify(task)}`)
            }
        },
        failureHook: async (): Promise<void> => {
            if (task?.taskId) {
                console.log(`Failed ${JSON.stringify(task)}`)
                await queue.taskFailed(task.taskId);
            } else {
                throw Error(`No taskId: ${JSON.stringify(task)}`)
            }
        },
    }
}

const createWorkhorse = async () : Promise<Workhorse> => {
    const sqlExecutor = await createDatabase();
    const taskQueue = await createTaskQueue(sqlExecutor);
    const taskRunner = createTaskRunner(taskQueue);
    const taskExecutor = createActor(taskExecutorMachine.provide({
        actors: { 
            reserveHook: fromPromise(taskRunner.reserveHook),
            executeHook: fromPromise(taskRunner.exeuteHook),
            successHook: fromPromise(taskRunner.sucessHook),
            failureHook: fromPromise(taskRunner.failureHook),
         }
    }));

    taskExecutor.subscribe((snapshot) => console.log(snapshot.value));
    taskExecutor.start();

    const workhorse = {
        addTask: (identity: string, payload: string) => {
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
        poll: async() => {
            taskExecutor.send( { type: 'poll' });
            await waitFor(taskExecutor, (state) => state.matches('ready'));
        }
    }

    return workhorse;
}

export { createWorkhorse };
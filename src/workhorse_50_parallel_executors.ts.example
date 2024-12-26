import { createDatabase } from "@/db/createDatabase";
import { createTaskQueue } from "@/db/createTaskQueue";
import { Payload, TaskConsumer, TaskRow, TaskState } from "@/types";
import { taskExecutorMachine } from "@/machines/TaskExecutorMachine";
import { Actor, ActorRefFromLogic, createActor, EventObject, fromPromise, MetaObject, NonReducibleUnknown, PromiseActorLogic, StateMachine, Values, waitFor } from "xstate";
import log from "loglevel"

//TODO: Should be used for all kinds of configurations / overrides
/*
const settings = {
    backoff: {
        initial: seconds(0.5),
        multiplier: 2.5,
        maxTime: minutes(15),
    }
};
*/
interface WorkhorseStatus {
    queued: number,
    successful: number,
    failed: number,
}

type RunTask = (taskId: string, payload: Payload) => Promise<void>;

interface Workhorse {
    addTask: (taskId: string, payload: Payload) => Promise<void>;
    getStatus: () => Promise<WorkhorseStatus>;
    poll: () => Promise<void>;
}

const createTaskRunner = (queue: TaskConsumer, run: RunTask) => {
    let task: undefined | TaskRow = undefined;
    return {
        reserveHook: async (): Promise<void> => {
            log.debug(`Reserving task...`);
            task = await queue.reserveTask();
            if (!task) {
                log.debug('No reservation');
                throw new Error('No reservation');
            } else {
                log.debug(`Reserved task: ${JSON.stringify(task)}`);
            }
        },
        executeHook: async (): Promise<void> => {
            let taskId = undefined;
            let payloadMaybe = undefined;
            //TODO: Refactor this mess

            //TODO: All of this can be checked at THE TIME OF RESERVATION
            if (!task) {
                throw new Error(`Missing task`);
            }
            if (typeof task.taskRow.task_id !== "string") {
                throw new Error(`Missing task_id for ${task.rowId.toString()}`);
            } else {
                taskId = task.taskRow.task_id;
            }
            if (typeof task.taskRow.task_payload !== "string") {
                throw new Error(`Missing task_payload for ${task.rowId.toString()}`);
            } else {
                try {
                    payloadMaybe = JSON.parse(task.taskRow.task_payload);
                } catch(e) {
                    let errorInfo = '';
                    if (e instanceof Error) {
                        errorInfo = [e.message, e.stack].join("\n");
                    }
                    throw new Error(`Failed to parse payload for ${task.rowId.toString()}: ${errorInfo}`);
                }
            }
            if (payloadMaybe==null) {
                throw new Error(`Missing payload for ${task.rowId.toString()}`)
            } else {
                const payload = payloadMaybe;
                await run(taskId, payload);
            }
        },
        sucessHook: async (): Promise<void> => {
            if (task?.rowId) {
                log.debug(`Succesful ${JSON.stringify(task)}`)
                await queue.taskSuccessful(task.rowId);
            } else {
                throw Error(`No taskId: ${JSON.stringify(task)}`)
            }
        },
        failureHook: async (): Promise<void> => {
            if (task?.rowId) {
                log.debug(`Failed ${JSON.stringify(task)}`)
                await queue.taskFailed(task.rowId);
            } else {
                throw Error(`No taskId: ${JSON.stringify(task)}`)
            }
        },
    }
}

const createWorkhorse = async (run: RunTask) : Promise<Workhorse> => {
    const sqlExecutor = await createDatabase();
    const taskQueue =  createTaskQueue(sqlExecutor);
    const taskRunner = createTaskRunner(taskQueue, run);
    const machine = taskExecutorMachine.provide({
        actors: {
            reserveHook: fromPromise(taskRunner.reserveHook),
            executeHook: fromPromise(taskRunner.executeHook),
            successHook: fromPromise(taskRunner.sucessHook),
            failureHook: fromPromise(taskRunner.failureHook),
        },
    })

    const executors: Actor<StateMachine<{}, { type: "poll"; }, { [x: string]: ActorRefFromLogic<PromiseActorLogic<void, NonReducibleUnknown, EventObject>> | undefined; }, Values<{ reserveHook: { src: "reserveHook"; logic: PromiseActorLogic<void, NonReducibleUnknown, EventObject>; id: string | undefined; }; executeHook: { src: "executeHook"; logic: PromiseActorLogic<void, NonReducibleUnknown, EventObject>; id: string | undefined; }; failureHook: { src: "failureHook"; logic: PromiseActorLogic<void, NonReducibleUnknown, EventObject>; id: string | undefined; }; successHook: { src: "successHook"; logic: PromiseActorLogic<void, NonReducibleUnknown, EventObject>; id: string | undefined; }; }>, never, never, "DELAY", "idle" | "ready" | "reservingTask" | "taskExecuting" | "noReservation" | "taskSuccessful" | "taskFailed" | "continue" | "backingOff" | "halted", string, NonReducibleUnknown, NonReducibleUnknown, EventObject, MetaObject, { readonly context: {}; readonly id: "TaskExecutor"; readonly initial: "idle"; readonly states: { readonly idle: { readonly always: { readonly target: "ready"; }; }; readonly ready: { readonly on: { readonly poll: { readonly target: "reservingTask"; }; }; }; readonly reservingTask: { readonly invoke: { readonly src: "reserveHook"; readonly onDone: { readonly target: "taskExecuting"; }; readonly onError: { readonly target: "noReservation"; }; }; }; readonly taskExecuting: { readonly invoke: { readonly src: "executeHook"; readonly onDone: { readonly target: "taskSuccessful"; }; readonly onError: { readonly target: "taskFailed"; }; }; }; readonly noReservation: { readonly always: { readonly target: "continue"; }; }; readonly taskFailed: { readonly invoke: { readonly src: "failureHook"; readonly onDone: { readonly target: "backingOff"; }; readonly onError: { readonly target: "halted"; }; }; }; readonly taskSuccessful: { readonly entry: () => void; readonly invoke: { readonly src: "successHook"; readonly onDone: { readonly target: "continue"; }; readonly onError: { readonly target: "halted"; }; }; }; readonly continue: { readonly always: { readonly target: "ready"; }; }; readonly backingOff: { readonly after: { readonly DELAY: { readonly target: "continue"; }; }; readonly exit: () => void; }; readonly halted: { readonly type: "final"; }; }; }>>[] = [];
    for(let i=0;i<50;i++) {
        const taskExecutor = createActor(machine);

        //TODO: Add some good way to inspect / diagnose stuff
        //taskExecutor.subscribe((snapshot) => log.info(snapshot.value));
        taskExecutor.start();
        executors.push(taskExecutor);
    }

    const workhorse = {
        addTask: (identity: string, payload: Payload) => {
            const jsonPayload = JSON.stringify(payload);
            return taskQueue.addTask(identity, jsonPayload);
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
            for (const executor of executors) {
                await waitFor(executor, (state) => state.hasTag('ready'));
                executor.send( { type: 'poll' });
                await waitFor(executor, (state) => !state.hasTag('busy'));
            }
        }
    }

    return workhorse;
}

export { createWorkhorse };
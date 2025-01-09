import {setup, fromPromise, waitFor, createActor, assign, assertEvent } from "xstate";
import { Payload, WorkhorseStatus, TaskQueue, TaskExecutorPool, QueueStatus } from "@/types.ts";

type ResetEvent = { type: "reset" }
type RequeueEvent = { type: "taskQueue.requeue" }
type QueueEvent = { type: "taskQueue.queue"; taskId: string; payload: Payload }
type GetStatusEvent = { type: "taskQueue.getStatus" }
type StartExecutorsEvent = { type: "executors.start" }
type StopExecutorsEvent = { type: "executors.stop" }
type PollEvent = { type: "executors.poll" }

type MachineEvent = ResetEvent | RequeueEvent | QueueEvent | GetStatusEvent |
    StartExecutorsEvent | StopExecutorsEvent | PollEvent

type CommandDispatcherContext = {
    status: WorkhorseStatus;
    queue: TaskQueue;
    executors: TaskExecutorPool;
};

const dispatchHook = fromPromise(
    async ({ input }: { input: { event: MachineEvent, queue: TaskQueue, executors: TaskExecutorPool } }) => {
        const { event, queue, executors } = input;

        switch (event.type) {
            case "taskQueue.queue":
                if ("taskId" in event) {
                    await queue.addTask(event.taskId, event.payload);
                }
                break;
            case "taskQueue.requeue":
                await queue.requeue();
                break;
            case "executors.start":
                await executors.startAll();
                break;
            case "executors.stop":
                await executors.stopAll();
                break;
            case "executors.poll":
                await executors.pollAll();
                break;
        }

        return await queue.getStatus();
    }
)

export const createCommandDispatcherMachine = () => {
    return setup({
        types: {
            context: {} as CommandDispatcherContext,
            events: {} as MachineEvent,
            input: {} as {
                queue: TaskQueue,
                executors: TaskExecutorPool;
            },
        },
        actors: {
            dispatchCommand: dispatchHook,
        },
    }).createMachine({
        id: "commandDispatcher",
        initial: "ready",
        context: ({ input }) => {
            return {
                status: { queued: 0, completed: 0, successful: 0, failed: 0, executing: 0 },
                queue: input.queue,
                executors: input.executors,
            };
        },
        states: {
            ready: {
                tags: ["ready"],
                on: {
                    "taskQueue.getStatus": { target: "dispatching" },
                    "taskQueue.queue": { target: "dispatching" },
                    "taskQueue.requeue": { target: "dispatching" },
                    "executors.start": { target: "dispatching" },
                    "executors.stop": { target: "dispatching" },
                    "executors.poll": { target: "dispatching" },
                    "*": { target: "unexpectedEvent" }, // Handle unexpected events
                },
            },
            dispatching: {
                tags: ["dispatching"],
                invoke: {
                    input: ({ context, event }) => { return { queue: context.queue, executors: context.executors, event }},
                    src: "dispatchCommand",
                    onDone: {
                        target: "success",
                        actions: assign({
                            status: ({ event }) => event.output,
                        }),
                    },
                    onError: { 
                        target: "error" 
                    },
                },
            },
            success: {
                tags: ["success"],
                on: {
                    "reset": {
                        target: "ready",
                    },
                },
            },
            unexpectedEvent: {
                tags: ["unexpected"],
                always: { target: "ready" },
            },
            error: {
                tags: ["error"],
                type: "final",
            },
        },
    });
};

export const createCommandDispatcher = (queue: TaskQueue, executors: TaskExecutorPool) => {
    const machine = createCommandDispatcherMachine();
    const actor = createActor(machine, { input: { queue, executors }});
/*
    actor.subscribe((snapshot) => {
        console.log(snapshot.value);
    });
*/
    const executeCommand = () => async (event: MachineEvent): Promise<QueueStatus> => {
        await waitFor(actor,(state) => state.hasTag('ready'));
        actor.send(event);  
        await waitFor(actor, (state) => state.hasTag('success'));
        const status = actor.getSnapshot().context.status;
        actor.send({ "type": "reset" });
        return status;
    };   

    const execute = executeCommand();

    actor.start();

    return {
        getStatus: () => execute({ type: "taskQueue.getStatus" }),
        queue: (taskId: string, payload: Payload) => execute({ type: "taskQueue.queue", taskId, payload }),
        requeue: () => execute({ type: "taskQueue.requeue" }),
        startExecutors: () => execute({ type: "executors.start" }),
        stopExecutors: () => execute({ type: "executors.stop" }),
        poll: () => execute({ type: "executors.poll" })
    };
};
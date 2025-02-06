import {
  setup,
  fromPromise,
  waitFor,
  createActor,
  assign,
} from "xstate";

import {
  Payload,
  WorkhorseStatus,
  TaskQueue,
  TaskExecutorPool,
  QueueStatus,
} from "@/types.ts";

enum TaskQueueCommand {
    Queue = "taskQueue.queue",
    Requeue = "taskQueue.requeue",
    GetStatus = "taskQueue.getStatus"
}

enum ExecutorCommand {
    Start = "executors.start",
    Stop = "executors.stop",
    Poll = "executors.poll"
}

enum MachineCommand {
    Reset = "reset"
}

type ResetEvent = { type: MachineCommand.Reset };
type RequeueEvent = { type: TaskQueueCommand.Requeue };
type QueueEvent = { type: TaskQueueCommand.Queue; taskId: string; payload: Payload };
type GetStatusEvent = { type: TaskQueueCommand.GetStatus };
type StartExecutorsEvent = { type: ExecutorCommand.Start };
type StopExecutorsEvent = { type: ExecutorCommand.Stop };
type PollEvent = { type: ExecutorCommand.Poll };

type MachineEvent = 
    | ResetEvent 
    | RequeueEvent 
    | QueueEvent 
    | GetStatusEvent 
    | StartExecutorsEvent 
    | StopExecutorsEvent 
    | PollEvent;


type DispatcherContext = {
    status: WorkhorseStatus;
    queue: TaskQueue;
    executors: TaskExecutorPool;
};

type Tag = "ready" | "dispatching" | "success" | "unexpected" | "error";

const EmptyStatus = { queued: 0, successful: 0, failed: 0, executing: 0 };

const dispatchHook = fromPromise(
    async ({ input }: { input: { event: MachineEvent, queue: TaskQueue, executors: TaskExecutorPool } }): Promise<QueueStatus> => {
        const { event, queue, executors } = input;
        let status = EmptyStatus;

        switch (event.type) {
            case TaskQueueCommand.Queue:
                if ("taskId" in event) {
                    await queue.addTask(event.taskId, event.payload);
                }
                break;
            case TaskQueueCommand.Requeue:
                await queue.requeue();
                break;
            case ExecutorCommand.Start:
                await executors.startAll();
                break;
            case ExecutorCommand.Stop:
                await executors.stopAll();
                break;
            case ExecutorCommand.Poll:
                await executors.pollAll();
                break;
            case TaskQueueCommand.GetStatus:
                status = await queue.getStatus();
                break;
        }

        return status;
    }
);

const createDispatcherMachine = () => {
  return setup({
    types: {
      context: {} as DispatcherContext,
      events: {} as MachineEvent,
      input: {} as {
        queue: TaskQueue;
        executors: TaskExecutorPool;
      },
      tags: {} as Tag,
    },
    actors: {
      dispatchCommand: dispatchHook,
    },
  }).createMachine({
    id: "commandDispatcher",
    initial: "ready",
    context: ({ input }) => {
      return {
        status: {... EmptyStatus },
        queue: input.queue,
        executors: input.executors,
      };
    },
    states: {
      ready: {
        tags: ["ready"],
        on: {
            [TaskQueueCommand.GetStatus]: { target: "dispatching" },
            [TaskQueueCommand.Queue]: { target: "dispatching" },
            [TaskQueueCommand.Requeue]: { target: "dispatching" },
            [ExecutorCommand.Start]: { target: "dispatching" },
            [ExecutorCommand.Stop]: { target: "dispatching" },
            [ExecutorCommand.Poll]: { target: "dispatching" },
            "*": { target: "unexpectedEvent" },
        },
      },
      dispatching: {
        tags: ["dispatching"],
        invoke: {
          input: ({ context, event }) => {
            return {
              queue: context.queue,
              executors: context.executors,
              event,
            };
          },
          src: "dispatchCommand",
          onDone: {
            target: "success",
            actions: assign({
              status: ({ event }) => event.output,
            }),
          },
          onError: {
            target: "error",
          },
        },
      },
      success: {
        tags: ["success"],
        on: {
          reset: {
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

const createDispatcher = (queue: TaskQueue, executors: TaskExecutorPool) => {
    const machine = createDispatcherMachine();
    const actor = createActor(machine, { input: { queue, executors } });

    const execute = async (event: MachineEvent): Promise<QueueStatus> => {
        await waitFor(actor, (state) => state.hasTag('ready'));
        actor.send(event);
        await waitFor(actor, (state) => state.hasTag('success'));
        const status = actor.getSnapshot().context.status;
        actor.send({ type: MachineCommand.Reset });
        return status;
    };

    actor.start();

    return {
        getStatus: () => execute({ type: TaskQueueCommand.GetStatus }),
        queue: (taskId: string, payload: Payload) => execute({ type: TaskQueueCommand.Queue, taskId, payload }),
        requeue: () => execute({ type: TaskQueueCommand.Requeue }),
        startExecutors: () => execute({ type: ExecutorCommand.Start }),
        stopExecutors: () => execute({ type: ExecutorCommand.Stop }),
        poll: () => execute({ type: ExecutorCommand.Poll })
    };
};

export { createDispatcherMachine, createDispatcher };
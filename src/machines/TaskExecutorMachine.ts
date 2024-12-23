import { setup, fromPromise, assign } from "xstate";

// Define asynchronous functions
const reserveTask = async (): Promise<void> => {
};

const executeTask = async (): Promise<void> => {
};

const handleFailure = async (): Promise<void> => {
};

const handleSuccess = async (): Promise<void> => {
};

// Create the state machine setup
const machineSetup = setup({
  types: {
    context: { backoff: 500 } as { backoff: number },
    events: {} as { type: "poll" },
  },
  actions: {
    resetBackoffAction: assign({
      backoff: () => 500, // Resetting the backoff duration to 500ms
    }),
    increaseBackoffAction: assign({
      backoff: ({context}) => Math.min(context.backoff * 2, 16000), // Double the backoff duration with a cap at 16 seconds
    }),
  },
  actors: {
    reserveHook: fromPromise(reserveTask),
    executeHook: fromPromise(executeTask),
    failureHook: fromPromise(handleFailure),
    successHook: fromPromise(handleSuccess),
  },
});

// Configure the machine with states and transitions
export const taskExecutorMachine = machineSetup.createMachine({
  context: { backoff: 500 },
  id: "TaskExecutor",
  initial: "ready",
  states: {
    ready: {
      on: {
        poll: { target: "reservingTask" },
      },
    },
    reservingTask: {
      invoke: {
        input: {},
        src: "reserveHook",
        onDone: { target: "executingTask" },
        onError: { target: "noReservation" },
      },
    },
    executingTask: {
      invoke: {
        input: {},
        src: "executeHook",
        onDone: { target: "taskSuccessful" },
        onError: { target: "taskFailed" },
      },
    },
    noReservation: {
      always: { target: "continue" },
    },
    taskFailed: {
      invoke: {
        input: {},
        src: "failureHook",
        onDone: { target: "backingOff" },
        onError: { target: "halted" },
      },
    },
    taskSuccessful: {
      entry: { type: "resetBackoffAction" },
      invoke: {
        input: {},
        src: "successHook",
        onDone: { target: "continue" },
        onError: { target: "halted" },
      },
    },
    continue: {
      always: { target: "ready" },
    },
    backingOff: {
      after: {
        "500": { target: "continue" },
      },
      exit: { type: "increaseBackoffAction" },
    },
    halted: {
      type: "final",
    },
  },
});


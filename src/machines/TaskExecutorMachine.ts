import { createBackoff } from "@/util/backoff";
import { setup, fromPromise } from "xstate";

const reserveTask = async (): Promise<void> => {
};

const executeTask = async (): Promise<void> => {
};

const handleFailure = async (): Promise<void> => {
};

const handleSuccess = async (): Promise<void> => {
};

//TODO: Should be passed in to make more configurable
const backoff = createBackoff({initial: 500, multiplier: 2.5, maxTime: 16000});

// Create the state machine setup
const machineSetup = setup({
  types: {
    context: {},
    events: {} as { type: "poll" },
  },
  actors: {
    reserveHook: fromPromise(reserveTask),
    executeHook: fromPromise(executeTask),
    failureHook: fromPromise(handleFailure),
    successHook: fromPromise(handleSuccess),
  },
  delays: {
    DELAY: () => backoff.getBackoff(),
  }
});

// Configure the machine with states and transitions
export const taskExecutorMachine = machineSetup.createMachine({
  context: {},
  id: "TaskExecutor",
  initial: "idle",
  states: {
    idle: { always: {target: 'ready'}},
    ready: {
      tags: ['ready'],
      on: {
        poll: { target: "reservingTask" },
      },
    },
    reservingTask: {
      tags: ['busy'],
      invoke: {
        src: "reserveHook",
        onDone: { target: "taskExecuting" },
        onError: { target: "noReservation" },
      },
    },
    taskExecuting: {
      invoke: {
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
        src: "failureHook",
        onDone: { target: "backingOff" },
        onError: { target: "halted" },
      },
    },
    taskSuccessful: {
      entry: () => {backoff.resetBackoff()},
      invoke: {
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
        DELAY: { target: "continue" },
      },
      exit: () => { backoff.increaseBackoff()}, // Increase backoff on exit
    },
    halted: {
      type: "final",
    },
  },
});

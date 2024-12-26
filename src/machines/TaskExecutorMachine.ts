import {createBackoff} from "@/util/backoff";
import {createActor, fromPromise, setup} from "xstate";
import {WorkhorseConfig, TaskRunner} from "@/types.ts";

const reserveTask = async (): Promise<void> => {};
const executeTask = async (): Promise<void> => {};
const handleFailure = async (): Promise<void> => {};
const handleSuccess = async (): Promise<void> => {};

//TODO: Should be passed in to make more configurable
let backoff = createBackoff({initial: 500, multiplier: 2.5, maxTime: 16000});

// Create the state machine setup
const machineSetup = setup({
  types: {
    context: {},
    events: {} as { type: "start" } | { type: "stop" } | { type: "poll" },
    tags: {} as 'ready' | 'stopped' | 'canStop' | 'busy' | 'executing' | 'executed' | 'failure' | 'success' | 'critical'
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

export const taskExecutorMachine = machineSetup.createMachine({
  context: {},
  id: "TaskExecutor",
  initial: "idle",
  states: {
    idle: {
      tags: ['stopped', 'canStop'],
      on: { start: { target: "ready"} } },
    ready: {
      tags: ['ready', 'canStop'],
      on: {
        poll: { target: "reservingTask" },
        stop: { target: "idle" },
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
      tags: ['executing'],
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
      tags: ['failure', 'executed'],
      invoke: {
        src: "failureHook",
        onDone: { target: "backingOff" },
        onError: { target: "halted" },
      },
    },
    taskSuccessful: {
      tags: ['success', 'executed'],
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
      tags: ['canStop'],
      on: { stop: 'idle'},
      after: {
        DELAY: { target: "continue" },
      },
      exit: () => { backoff.increaseBackoff()}, // Increase backoff on exit
    },
    halted: {
      tags: ['critical', 'stopped', 'canStop'],
      type: "final",
    },
  },
});

export function createTaskExecutor(taskRunner: TaskRunner, settings: WorkhorseConfig) {
  backoff = createBackoff(settings.backoff);
    const machine = taskExecutorMachine.provide({
        actors: {
            reserveHook: fromPromise(taskRunner.reserveHook),
            executeHook: fromPromise(taskRunner.executeHook),
            successHook: fromPromise(taskRunner.sucessHook),
            failureHook: fromPromise(taskRunner.failureHook),
        },
    })
    const taskExecutor = createActor(machine);
    taskExecutor.start();
    taskExecutor.send({ type: 'start' });

    return taskExecutor;
}
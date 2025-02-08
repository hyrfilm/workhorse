import { createBackoff } from '@/util/backoff.ts';
import { createActor, fromPromise, setup, waitFor } from 'xstate';
import {
  WorkhorseConfig,
  TaskHooks,
  SingleTaskExecutor,
  Inspector,
} from '@/types.ts';

const reserveTask = async (): Promise<void> => {};
const executeTask = async (): Promise<void> => {};
const handleFailure = async (): Promise<void> => {};
const handleSuccess = async (): Promise<void> => {};

let backoff = createBackoff({ initial: 500, multiplier: 2.5, maxTime: 16000 });

type Event = { type: 'start' } | { type: 'stop' } | { type: 'poll' };
type Tag =
  | 'stopped'
  | 'started'
  | 'ready'
  | 'canStop'
  | 'busy'
  | 'executing'
  | 'executed'
  | 'failure'
  | 'success'
  | 'critical';
type Status = 'stopped' | 'started' | 'critical';

// Create the state machine setup
const machineSetup = setup({
  types: {
    context: {},
    events: {} as Event,
    tags: {} as Tag,
  },
  actors: {
    reserveHook: fromPromise(reserveTask),
    executeHook: fromPromise(executeTask),
    failureHook: fromPromise(handleFailure),
    successHook: fromPromise(handleSuccess),
  },
  delays: {
    DELAY: () => backoff.getBackoff(),
  },
});

export const taskExecutorMachine = machineSetup.createMachine({
  context: {},
  id: 'TaskExecutor',
  initial: 'idle',
  states: {
    idle: {
      tags: ['stopped', 'canStop'],
      on: { start: { target: 'ready' } },
    },
    ready: {
      tags: ['ready', 'canStop', 'started'],
      on: {
        poll: { target: 'reservingTask' },
        stop: { target: 'idle' },
      },
    },
    reservingTask: {
      tags: ['busy', 'started'],
      invoke: {
        src: 'reserveHook',
        onDone: { target: 'taskExecuting' },
        onError: { target: 'noReservation' },
      },
    },
    taskExecuting: {
      tags: ['executing', 'started'],
      invoke: {
        src: 'executeHook',
        onDone: { target: 'taskSuccessful' },
        onError: { target: 'taskFailed' },
      },
    },
    noReservation: {
      tags: ['started'],
      always: { target: 'continue' },
    },
    taskFailed: {
      tags: ['failure', 'executed', 'started'],
      invoke: {
        src: 'failureHook',
        onDone: { target: 'backingOff' },
        onError: { target: 'halted' },
      },
    },
    taskSuccessful: {
      tags: ['success', 'executed', 'started'],
      entry: () => {
        backoff.resetBackoff();
      },
      invoke: {
        src: 'successHook',
        onDone: { target: 'continue' },
        onError: { target: 'halted' },
      },
    },
    continue: {
      tags: ['started'],
      always: { target: 'ready' },
    },
    backingOff: {
      tags: ['canStop', 'started'],
      on: { stop: 'idle' },
      after: {
        DELAY: { target: 'continue' },
      },
      exit: () => {
        backoff.increaseBackoff();
      }, // Increase backoff on exit
    },
    halted: {
      tags: ['critical', 'stopped', 'canStop'],
      type: 'final',
    },
  },
});

export function createTaskExecutor(
  config: WorkhorseConfig,
  taskRunner: TaskHooks,
  inspect?: Inspector
): SingleTaskExecutor {
  backoff = createBackoff(config.backoff);
  const machine = taskExecutorMachine.provide({
    actors: {
      reserveHook: fromPromise(taskRunner.reserveHook),
      executeHook: fromPromise(taskRunner.executeHook),
      successHook: fromPromise(taskRunner.successHook),
      failureHook: fromPromise(taskRunner.failureHook),
    },
  });

  const actor = createActor(machine, { inspect });
  actor.start();

  const taskExecutor = {
    start: () => {
      actor.send({ type: 'start' });
    },
    stop: () => {
      actor.send({ type: 'stop' });
    },
    poll: () => {
      actor.send({ type: 'poll' });
    },
    waitFor: async (tag: Tag) => {
      await waitFor(actor, (state) => state.hasTag(tag));
    },
    waitIf: async (tag: Tag) => {
      await waitFor(actor, (state) => !state.hasTag(tag));
    },
    getStatus: (): Status => {
      const snapshot = actor.getSnapshot();
      const statusTags: Tag[] = ['started', 'critical', 'stopped'];
      for (const tag of statusTags) {
        if (snapshot.hasTag(tag)) {
          return tag as Status;
        }
      }
      const unreachable: never = snapshot.value as never;
      throw new Error(
        `Unexpected state: ${unreachable} ${JSON.stringify(snapshot.tags)}`
      );
    },
  };

  return taskExecutor;
}

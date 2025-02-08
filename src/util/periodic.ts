import { setup, fromPromise, createActor } from 'xstate';

const startEvent = { type: 'start' };
const stopEvent = { type: 'stop' };

interface PeriodicJob {
  start(): void;
  stop(): void;
}

const createPeriodicJob = (
  func: () => Promise<void>,
  interval: number
): PeriodicJob => {
  const actor = createActor(
    machine.provide({
      actors: { runJob: fromPromise(func) },
      delays: { interval },
    })
  );
  actor.start();
  return {
    start: () => {
      actor.send(startEvent);
    },
    stop: () => {
      actor.send(stopEvent);
    },
  };
};

const machine = setup({
  types: {
    context: {} as object,
    events: {} as typeof startEvent | typeof stopEvent,
  },
  actors: {
    runJob: fromPromise(async () => {}),
  },
}).createMachine({
  context: {},
  id: 'PeriodicTaskMachine',
  initial: 'idle',
  states: {
    idle: {
      on: {
        start: {
          target: 'running',
        },
      },
    },
    running: {
      initial: 'invoking',
      on: {
        stop: {
          target: 'idle',
        },
      },
      states: {
        invoking: {
          invoke: {
            src: 'runJob',
            input: {},
            onDone: {
              target: 'sleeping',
            },
            onError: {
              target: '#PeriodicTaskMachine.failed',
            },
          },
        },
        sleeping: {
          after: {
            interval: {
              target: 'invoking',
            },
          },
        },
      },
    },
    failed: {
      type: 'final',
    },
  },
});

export { createPeriodicJob };
export type { PeriodicJob };

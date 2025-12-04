import { setup, fromPromise, createActor } from 'xstate';

const startEvent = { type: 'start' };
const stopEvent = { type: 'stop' };
const pauseEvent = { type: 'pause' };
const resumeEvent = { type: 'resume' };

interface PeriodicJob {
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
}

const createPeriodicJob = (func: () => Promise<void>, interval: number): PeriodicJob => {
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
    pause: () => {
      actor.send(pauseEvent);
    },
    resume: () => {
      actor.send(resumeEvent);
    },
  };
};

const machine = setup({
  types: {
    context: {} as object,
    events: {} as typeof startEvent | typeof stopEvent | typeof pauseEvent | typeof resumeEvent,
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
      on: {
        stop: {
          target: 'idle',
        },
        pause: {
          target: 'paused',
        },
      },
      initial: 'invoking',
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
    paused: {
      on: {
        resume: {
          target: 'running',
        },
        stop: {
          target: 'idle',
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

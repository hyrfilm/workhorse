import { setup } from "xstate";

export const machine = setup({
  types: {
    context: {} as {},
  },
  actors: {
    activateHook: createMachine({
      /* ... */
    }),
    shutdownHook: createMachine({
      /* ... */
    }),
    autoPollHook: createMachine({
      /* ... */
    }),
    pollHook: createMachine({
      /* ... */
    }),
    RequeueHook: createMachine({
      /* ... */
    }),
    deactivateHook: createMachine({
      /* ... */
    }),
    errorHook: createMachine({
      /* ... */
    }),
  },
}).createMachine({
  context: {},
  id: "TaskQueueMachine",
  initial: "Inactive",
  states: {
    Inactive: {
      on: {
        activate: {
          target: "Activating",
        },
        shutDown: {
          target: "ShuttingDown",
        },
      },
    },
    Activating: {
      always: {
        target: "Active",
      },
      invoke: {
        input: {},

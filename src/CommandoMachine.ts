import { setup, fromPromise } from "xstate";

export const machine = setup({
    types: {
        context: {} as {},
        events: {} as
            | { type: "reset" }
            | { type: "taskQueue.requeue" }
            | { type: "taskQueue.queue" }
            | { type: "taskQueue.getStatus" }
            | { type: "executors.start" }
            | { type: "executors.stop" }
            | { type: "executors.poll" }
            | { type: "initialize" },
    },
    actions: {
        storeResult: function ({ context, event }, params) {
            // Add your action code here
            // ...
        },
    },
    actors: {
        sendToQueue: fromPromise(async () => {
            // ...
        }),
    },
}).createMachine({
    context: {},
    id: "CommandMachine",
    initial: "Idle",
    states: {
        Idle: {
            on: {
                initialize: {
                    target: "Ready",
                },
            },
        },
        Ready: {
            on: {
                "*": {
                    target: "Dispatching",
                },
            },
        },
        Dispatching: {
            on: {
                "taskQueue.getStatus": {
                    target: "Requesting",
                },
                "taskQueue.queue": {
                    target: "Requesting",
                },
                "taskQueue.requeue": {
                    target: "Requesting",
                },
                "executors.start": {
                    target: "Requesting",
                },
                "executors.stop": {
                    target: "Requesting",
                },
                "executors.poll": {
                    target: "Requesting",
                },
                "*": {
                    target: "DispatchError",
                },
            },
        },
        Requesting: {
            invoke: {
                input: {},
                onDone: {
                    target: "Success",
                },
                onError: {
                    target: "Error",
                },
                src: "sendToQueue",
            },
        },
        DispatchError: {
            always: {
                target: "Error",
            },
        },
        Success: {
            on: {
                reset: {
                    target: "Ready",
                },
            },
            entry: {
                type: "storeResult",
            },
        },
        Error: {
            type: "final",
        },
    },
});

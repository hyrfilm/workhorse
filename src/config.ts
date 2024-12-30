// @ts-nocheck
// TODO: @ts-nocheck is a temporary solution because we don't want to declare the actual database here
// TODO: Since the tests run in node and uses better-sqlite and if we define the actual
// TODO: database here we'll trigger a chain of imports that will fail when running tests
import { DuplicateStrategy, WorkhorseConfig } from "./types";
import { minutes, seconds } from "./util/time";

const config: WorkhorseConfig = {
    concurrency: 1,
    poll: {
        auto: false,
        interval: seconds(0.25),
        pre: {
            wait: 'ready'
        },
        post: {
            wait: 'busy',
        }
    },
    taks: {
        include: {
            rowId: false
        }
    },
    backoff: {
        initial: seconds(0.5),
        multiplier: 2.5,
        maxTime: minutes(15),
    },
    duplicates: DuplicateStrategy.IGNORE,
    factories: {
        createDatabase: null,
        createTaskQueue: null,
        createTaskRunner: null,
        createTaskExecutor: null,
        createExecutorPool: null,
    }
};

const getDefaultConfig = () => {
    return structuredClone(config);
}

export { getDefaultConfig, config };

// @ts-nocheck
// TODO: @ts-nocheck is a temporary solution because we don't want to declare the actual database here
// TODO: Since the tests run in node and uses better-sqlite and if we define the actual
// TODO: database here we'll trigger a chain of imports that will fail when running tests
import {DuplicateStrategy, PollStrategy, TaskOrderingStrategy, WorkhorseConfig} from "./types";
import { minutes, seconds } from "./util/time";

const config: WorkhorseConfig = {
    concurrency: 1,
    pollStrategy: PollStrategy.SERIAL,

    poll: {
        //TODO: auto=true is not yet implemented
        auto: false,
        interval: seconds(0.25),
        //TODO: Call these something else these names are not clear
        pre: {
            wait: 'ready'
        }
    },
    taks: {
        include: {
            rowId: false //TODO: true is not yet implemented
        },
        delivery: {
            ordering: TaskOrderingStrategy.BEST_EFFORT,
        },
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
        createHooks: null,
        createTaskExecutor: null,
        createExecutorPool: null,
    }
};

const getDefaultConfig = () => {
    return structuredClone(config);
}

export { getDefaultConfig, config };

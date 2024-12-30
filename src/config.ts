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
        createDatabase: undefined,
        createTaskQueue: undefined,
        createTaskRunner: undefined,
        createTaskExecutor: undefined,
    }
};

export { config };
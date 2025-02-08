import {DuplicateStrategy, TaskExecutorStrategy, WorkhorseConfig} from "./types";
import {millisec, minutes, seconds} from "./util/time";

const defaults: WorkhorseConfig = {
    concurrency: 1,
    taskExecution: TaskExecutorStrategy.SERIAL,
    logLevel: 'info',

    poll: {
        auto: false,
        interval: millisec(100),

        //TODO: Call these something else these names are not clear
        pre: {
            wait: 'ready'
        }
    },
    taks: {
        include: {
            rowId: false //TODO: true is not yet implemented
        },
    },
    backoff: {
        initial: seconds(0.5),
        multiplier: 2.5,
        maxTime: minutes(15),
    },
    duplicates: DuplicateStrategy.IGNORE,
    plugins: [],
};

const defaultOptions = () => {
    return structuredClone(defaults);
}

export { defaultOptions };

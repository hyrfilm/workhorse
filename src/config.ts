import { DuplicateStrategy, TaskExecutorStrategy, WorkhorseConfig } from './types';
import { millisec, minutes, seconds } from './util/time';
import {TaskMonitor} from "@/plugins/TaskMonitor.ts";
import {PauseWhenOffline} from "@/plugins/PauseWhenOffline.ts";

const defaults: WorkhorseConfig = {
  concurrency: 1,
  taskExecution: TaskExecutorStrategy.SERIAL,
  logLevel: 'info',

  poll: {
    auto: false,
    interval: millisec(100),

    //TODO: Call these something else these names are not clear
    pre: {
      wait: 'ready',
    },
  },
  backoff: {
    initial: seconds(0.5),
    multiplier: 2.5,
    maxTime: minutes(15),
  },
  duplicates: DuplicateStrategy.IGNORE,
  plugins: [ new TaskMonitor(), new PauseWhenOffline() ],
};

const defaultOptions = (): WorkhorseConfig => {
  return defaults;
};

export { defaultOptions };

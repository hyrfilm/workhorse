import { LogLevel } from '@types';
import loglevel from 'loglevel';

const prefix = '[workhorse]: ';

const setLogLevel = (level: LogLevel): void => {
  loglevel.setLevel(level);
};

const log = (...s: string[]): void => {
  loglevel.info(prefix, ...s);
};

const error = (...s: string[]): void => {
  loglevel.info(prefix, 'ERROR - ', ...s);
};

export { log, error, setLogLevel };
export type { LogLevel };

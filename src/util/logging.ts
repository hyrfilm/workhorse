import { LogLevel } from '@types';
import loglevel from 'loglevel';

const prefix = '[workhorse]: ';

const setLogLevel = (level: LogLevel): void => {
  loglevel.setLevel(level);
};

const debug = (...s: string[]): void => {
  loglevel.debug(prefix, ...s);
};

const log = (...s: string[]): void => {
  loglevel.info(prefix, ...s);
};

const error = (...s: string[]): void => {
  loglevel.error(prefix, 'ERROR - ', ...s);
};

export { log, error, debug, setLogLevel };
export type { LogLevel };

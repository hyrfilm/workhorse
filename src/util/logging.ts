import loglevel from 'loglevel';

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

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

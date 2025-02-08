import log from 'loglevel';

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

const setLogLevel = (level: LogLevel): void => {
  log.setLevel(level);
};

export { setLogLevel };
export type { LogLevel };

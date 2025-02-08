import log from "loglevel";

type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

const setLogLevel = (level: LogLevel) => {
    log.setLevel(level);
}

export { setLogLevel };
export type { LogLevel };

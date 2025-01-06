class ReservationFailed extends Error {}
class DuplicateTaskError extends Error {}

class UnreachableError extends Error {
    constructor(nvr: never, message: string) {
        super(`${nvr}: ${message}`);
        this.name = "UnreachableError";
    }
}

class WorkhorseShutdownError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "WorkhorseShutdownError";
    }
}
export { ReservationFailed, DuplicateTaskError, UnreachableError, WorkhorseShutdownError };

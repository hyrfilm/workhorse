import {Payload, QueueStatus, Workhorse} from "@/types.ts";

class ReservationFailed extends Error {}
class DuplicateTaskError extends Error {}


const SHUTDOWN_ERROR_MSG = "This Workhorse instance has been shut down and is no longer available.";
const deadHorse: Workhorse = {
    addTask: function (_taskId: string, _payload: Payload): Promise<void> {
        throw new Error(SHUTDOWN_ERROR_MSG);
    },
    getStatus: function (): Promise<QueueStatus> {
        throw new Error(SHUTDOWN_ERROR_MSG);
    },
    poll: function (): Promise<void> {
        throw new Error(SHUTDOWN_ERROR_MSG);
    },
    start: function (): Promise<void> {
        throw new Error(SHUTDOWN_ERROR_MSG);
    },
    stop: function (): Promise<void> {
        throw new Error(SHUTDOWN_ERROR_MSG);
    },
    shutdown: function (): Promise<QueueStatus> {
        throw new Error(SHUTDOWN_ERROR_MSG);
    },
};

export { ReservationFailed, DuplicateTaskError, deadHorse };

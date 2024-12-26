import {RunTask, TaskConsumer, TaskRow, TaskRunner} from "@/types.ts";
import log from "loglevel";

const createTaskRunner = (queue: TaskConsumer, run: RunTask): TaskRunner => {
    let task: undefined | TaskRow = undefined;
    return {
        reserveHook: async (): Promise<void> => {
            log.debug(`Reserving task...`);
            task = await queue.reserveTask();
            if (!task) {
                log.debug('No reservation');
                throw new Error('No reservation');
            } else {
                log.debug(`Reserved task: ${JSON.stringify(task)}`);
            }
        },
        executeHook: async (): Promise<void> => {
            let taskId = undefined;
            let payloadMaybe = undefined;
            //TODO: Refactor this mess

            //TODO: All of this can be checked at THE TIME OF RESERVATION
            if (!task) {
                throw new Error(`Missing task`);
            }
            if (typeof task.taskRow.task_id !== "string") {
                throw new Error(`Missing task_id for ${task.rowId.toString()}`);
            } else {
                taskId = task.taskRow.task_id;
            }
            if (typeof task.taskRow.task_payload !== "string") {
                throw new Error(`Missing task_payload for ${task.rowId.toString()}`);
            } else {
                try {
                    payloadMaybe = JSON.parse(task.taskRow.task_payload);
                } catch (e) {
                    let errorInfo = '';
                    if (e instanceof Error) {
                        errorInfo = [e.message, e.stack].join("\n");
                    }
                    throw new Error(`Failed to parse payload for ${task.rowId.toString()}: ${errorInfo}`);
                }
            }
            if (payloadMaybe == null) {
                throw new Error(`Missing payload for ${task.rowId.toString()}`)
            } else {
                const payload = payloadMaybe;
                await run(taskId, payload);
            }
        },
        sucessHook: async (): Promise<void> => {
            if (task?.rowId) {
                log.debug(`Succesful ${JSON.stringify(task)}`)
                await queue.taskSuccessful(task.rowId);
            } else {
                throw Error(`No taskId: ${JSON.stringify(task)}`)
            }
        },
        failureHook: async (): Promise<void> => {
            if (task?.rowId) {
                log.debug(`Failed ${JSON.stringify(task)}`)
                await queue.taskFailed(task.rowId);
            } else {
                throw Error(`No taskId: ${JSON.stringify(task)}`)
            }
        },
    }
}

export { createTaskRunner };

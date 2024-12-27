import { assertTaskRow, RunTask, TaskConsumer, TaskRow, TaskRunner} from "@/types.ts";
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
                assertTaskRow(task);
                log.debug(`Reserved task: ${task.taskId}`);
            }
        },
        executeHook: async (): Promise<void> => {
            assertTaskRow(task);
            log.debug(`Task running: ${task.taskId}`)
            await run(task.taskId, task.payload);
        },
        successHook: async (): Promise<void> => {
            assertTaskRow(task);
            log.debug(`Task successful: ${task.taskId}`)
            await queue.taskSuccessful(task);
        },
        failureHook: async (): Promise<void> => {
            assertTaskRow(task);
            log.debug(`Task failed: ${task.taskId}`);
            await queue.taskFailed(task);
        },
    }
}

export { createTaskRunner };
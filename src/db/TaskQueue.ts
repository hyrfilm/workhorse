import { Payload, QueueStatus, TaskQueue, TaskRow, TaskState, DuplicateStrategy, WorkhorseConfig, RunQuery } from '@/types';
import {
    addTaskQuery,
    reserveTaskQuery,
    updateTaskStatusQuery,
    taskSuccessQuery,
    taskFailureQuery,
    getSingleStatusQuery,
    toTaskRow,
    requeueFailuresQuery,
    addTaskIfNotExistsQuery,
} from './sql';

function createTaskQueue(config: WorkhorseConfig, sql: RunQuery): TaskQueue {
    const taskQueue = {
        addTask: async (taskId: string, payload: Payload) => {
            let query = "";
            switch(config.duplicates) {
                case DuplicateStrategy.ERROR:
                    query = addTaskQuery(taskId, payload);
                    break;
                case DuplicateStrategy.IGNORE:
                    query = addTaskIfNotExistsQuery(taskId, payload);
                    break;
                default:
                    query = "This should not be possible" as never;
            }
            await sql(query);
        },
        reserveTask: async () => {
            const reserveQuery = reserveTaskQuery();
            const maybeTaskRow = await sql(reserveQuery);
            if (maybeTaskRow.length !== 1) {
                return undefined;
            }
            const dbRow = maybeTaskRow[0];

            const updateQuery = updateTaskStatusQuery(dbRow.id, TaskState.executing);
            await sql(updateQuery);
            return toTaskRow(dbRow);
        },
        taskSuccessful: async (taskRow: TaskRow) => {
            const query = taskSuccessQuery(taskRow.rowId);
            await sql(query);
        },
        taskFailed: async (taskRow: TaskRow) => {
            const query = taskFailureQuery(taskRow.rowId);
            await sql(query);
        },
        requeue: async (): Promise<undefined> => {
            const query = requeueFailuresQuery();
            await sql(query);
        },
        queryTaskCount: async (status: TaskState): Promise<number> => {
            const query = getSingleStatusQuery(status);
            const records = await sql(query);
            return records[0]['COUNT(*)'] as number;
        },
        getStatus: async (): Promise<QueueStatus> => {
            const queued = await taskQueue.queryTaskCount(TaskState.queued);
            const executing = await taskQueue.queryTaskCount(TaskState.executing);
            const successful = await taskQueue.queryTaskCount(TaskState.successful);
            const failed = await taskQueue.queryTaskCount(TaskState.failed);

            return { queued, executing, successful, failed };
        }
    };

    return taskQueue;
}

export { createTaskQueue };

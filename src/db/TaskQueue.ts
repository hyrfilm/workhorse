import { SqlExecutor, TaskQueue, TaskState } from '@/types';
import {
    addTaskQuery,
    reserveTaskQuery,
    updateTaskStatusQuery,
    taskSuccessQuery,
    taskFailureQuery,
    countStatusQuery,
    toTaskRow
} from './sql';

function createTaskQueue(sqlExecutor: SqlExecutor): TaskQueue {
    const sql = sqlExecutor;

    return {
        addTask: async (taskId, payload) => {
            const query = addTaskQuery(taskId, payload);
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
        taskSuccessful: async (taskRow) => {
            const query = taskSuccessQuery(taskRow.rowId);
            await sql(query);
        },
        taskFailed: async (taskRow) => {
            const query = taskFailureQuery(taskRow.rowId);
            await sql(query);
        },
        countStatus: async (status: TaskState) => {
            const query = countStatusQuery(status);
            const records = await sql(query);
            return records[0]['COUNT(*)'];
        },
    };
}

export { createTaskQueue };

import { SqlExecutor, TaskQueue, TaskState, FullStatus } from '@/types';
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
    getFullStatusQuery
} from './sql';
import { aw } from 'vitest/dist/chunks/reporters.D7Jzd9GS.js';

enum DuplicateStrategy {
    IGNORE = 'ignore',
    ERROR = 'error',
}

function createTaskQueue(sqlExecutor: SqlExecutor): TaskQueue {
    const sql = sqlExecutor;

    return {
        addTask: async (taskId, payload, ifDuplicate: DuplicateStrategy=DuplicateStrategy.IGNORE) => {
            let query = "";
            switch(ifDuplicate) {
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
        taskSuccessful: async (taskRow) => {
            const query = taskSuccessQuery(taskRow.rowId);
            await sql(query);
        },
        taskFailed: async (taskRow) => {
            const query = taskFailureQuery(taskRow.rowId);
            await sql(query);
        },
        requeueFailures: async () => {
            const query = requeueFailuresQuery();
            await sql(query);
        },
        getSingleStatus: async (status: TaskState) => {
            const query = getSingleStatusQuery(status);
            const records = await sql(query);
            return records[0]['COUNT(*)'];
        }
    };
}

export { createTaskQueue };

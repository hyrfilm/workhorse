import * as queries from "@/db/sql";
import {assertTaskRow, TaskQueue, TaskRow, TaskState} from "@/types";
import {schema, toTaskRow} from '@/db/sql';
import Database from 'better-sqlite3';

type Db =  Database.Database;

function createDbStub() {
    const db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.exec(schema);
    return db;
}

function runQuery(db: Db, query: string) {
    const stmt = db.prepare(query);
    stmt.run();
    if (query.toLowerCase().includes("select")) {
        const result = stmt.get();
        if (Array.isArray(result)) {
            return result;
        } else {
            return [result];
        }
    }
}

function createTaskQueueStub(): TaskQueue {
    const db = createDbStub();
    const sql = async (queryString: string) => {
        await Promise.resolve();
        return runQuery(db, queryString);
    }

    //TODO: This duplication of this stub compared to TaskQueue.ts is horrible and error-prone, fix and make DRY
    return {
        addTask: async (taskId, payload) => {
            const query = queries.addTaskQuery(taskId, payload);
            runQuery(db, query);
            await Promise.resolve();
        },
        reserveTask: async () => {
            const reserveQuery = queries.reserveTaskQuery();
            const maybeTaskRow = await sql(reserveQuery);
            if (maybeTaskRow?.length !== 1) {
                return undefined;
            }
            const taskRow = maybeTaskRow[0];
            const updateQuery = queries.updateTaskStatusQuery(taskRow.id, TaskState.executing);
            await sql(updateQuery);
            return toTaskRow(taskRow);
        },
        taskSuccessful: async (taskRow) => {
            const query = queries.taskSuccessQuery(taskRow.rowId);
            await sql(query);
        },
        taskFailed: async (taskRow) => {
            const query = queries.taskFailureQuery(taskRow.rowId);
            await sql(query);
        },
        countStatus: async (status: TaskState) => {
            const query = queries.countStatusQuery(status);
            const records = await sql(query);
            return records[0]['COUNT(*)'];
        },
    };
}

export { createTaskQueueStub };
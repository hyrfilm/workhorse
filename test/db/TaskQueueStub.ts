import { SqlExecutor, TaskQueue } from "@/types";
import { schema } from '@/db/sql';
import Database from 'better-sqlite3';
import { createTaskQueue } from "@/db/TaskQueue";

type Db =  Database.Database;

function createDbStub() {
    const db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.exec(schema);
    return db;
}

type Row = { [k:string]:unknown };

function runQuery(db: Db, query: string): Row[] | undefined {
    const stmt = db.prepare(query);
    stmt.run();
    if (query.toLowerCase().includes("select")) {
        const result : unknown = stmt.get();
        if (Array.isArray(result)) {
            return result as Row[];
        } else {
            return [result] as Row[];
        }
    }
}

function createTaskQueueStub(): TaskQueue {
    const db = createDbStub();
    const sql = async (queryString: string) => {
        await Promise.resolve();
        return runQuery(db, queryString);
    }

    return createTaskQueue(sql as SqlExecutor);
}

export { createTaskQueueStub };
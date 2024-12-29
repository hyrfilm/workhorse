import { QueryResult } from "@/types";
import { schema } from '@/db/sql';
import Database from 'better-sqlite3';

async function createDatabaseStub(): Promise<(query: string) => Promise<QueryResult[]>> {
    const db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.exec(schema);

    async function runQuery(query: string): Promise<QueryResult[]> {
        const stmt = db.prepare(query);
        stmt.run();
        let result: unknown = [];
        if (query.toLowerCase().includes("select")) {
            result = stmt.get();
            if (!Array.isArray(result)) {
                result = [result] as QueryResult[];
            }
        }
        return await Promise.resolve(result as QueryResult[]);
    }

    return Promise.resolve(runQuery);
}

export { createDatabaseStub };

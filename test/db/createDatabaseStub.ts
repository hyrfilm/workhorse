import { QueryResult } from '@/types';
import { schema } from '@/db/sql';
import Database from 'better-sqlite3';

async function createDatabaseStub(): Promise<(query: string) => Promise<QueryResult[]>> {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.exec(schema);

  async function runQuery(query: string): Promise<QueryResult[]> {
    try {
      const rows = db.prepare(query).all();
      return await Promise.resolve(rows as QueryResult[]);
    } catch (_e) {}

    try {
      const row = db.prepare(query).get();
      if (row == undefined) {
        return [];
      } else {
        return await Promise.resolve([row] as QueryResult[]);
      }
    } catch (e) {
      if (e instanceof TypeError) {
        db.prepare(query).run();
        return await Promise.resolve([]);
        throw e;
      }
    }
    return await Promise.reject();
  }
  return runQuery;
}

export { createDatabaseStub };

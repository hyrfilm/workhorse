import { QueryResult } from '@/types';
import { schema } from '@/db/sql';
import Database from 'better-sqlite3';

function createDatabaseStub(): Promise<(query: string) => Promise<QueryResult[]>> {
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
      } else {
        return Promise.reject(e);
      }
    }
  }
  // we return a promise because the actual implementation requires that
  // the interface that returns the database is async (in order for it to be
  // compatible with the actual implementation that runs in a webworker)
  return new Promise(resolve => {
    resolve(runQuery);
  });
}

export { createDatabaseStub };

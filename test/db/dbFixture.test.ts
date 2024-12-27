/* eslint-disable */
//import { schema } from '@/db/createDatabase';
import { schema } from '@/db/sql';
import Database from 'better-sqlite3';
import { test, beforeEach, afterEach, expect } from 'vitest';
import * as queries from '@/db/sql';

type Db =  Database.Database;

// Define a reusable function to run queries
function runQuery(db: Db, query: string, params = []) {
    const stmt = db.prepare(query);
    return stmt.all(...params);
}

test('dbFixture', () => {
    // Create a new in-memory database
    const db = new Database(':memory:');

    // Set PRAGMA for in-memory database
    db.pragma('journal_mode = WAL');

    // Execute schema setup
    db.exec(schema);

    // Run queries using the function
    const result = runQuery(db, queries.reserveTaskQuery());
    console.log(result);

    expect(result).toBeDefined();
});

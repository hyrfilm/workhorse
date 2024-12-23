import { SQLocal } from 'sqlocal';
import { SqlExecutor, TaskState } from './types';

async function createSchema(sql: SqlExecutor): Promise<void> {
    await sql`

CREATE TABLE task_status (
    id INTEGER PRIMARY KEY,                 -- Status ID (e.g., 1 for 'queued')
    name VARCHAR(16) UNIQUE NOT NULL,       -- Status name (e.g., 'queued', 'executing')
    is_terminal BOOLEAN DEFAULT 0 NOT NULL  -- Whether this status is terminal
);

INSERT INTO task_status (id, name, is_terminal) VALUES
    (${TaskState.queued}, 'queued', 0),         -- task is wating to be picked up
    (${TaskState.executing}, 'executing', 0),   -- task is being processed
    (${TaskState.successful}, 'successful', 1), -- task has been completed successfully
    (${TaskState.failed}, 'failed', 0);         -- task has failed and can be retried

-- CEATE CREATE TABLE task_queue (
CREATE TABLE task_queue (
-- Unique identifier for each task
id INTEGER PRIMARY KEY AUTOINCREMENT,
-- UUID for the task (ensures uniqueness)                     
identity VARCHAR(36) UNIQUE NOT NULL,
-- The JSON payload of the task                     
payload TEXT NOT NULL,
-- Foreign key to task_status                                    
status_id INTEGER NOT NULL REFERENCES task_status(id),
-- Retry counter, must be non-negative    
retries INTEGER DEFAULT 0 CHECK (retries >= 0),
-- Task creation timestamp          
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
-- Last update timestamp  
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
-- Completion timestamp (NULL if not completed)  
completed_at TIMESTAMP);

`};

//TODO: This just one big dummy implementation
const createDatabase = async (): Promise<SqlExecutor> => {
    const { deleteDatabaseFile } = new SQLocal('database.sqlite3');
    await deleteDatabaseFile();
    // stored in the origin private file system
    const { sql } = new SQLocal('database.sqlite3');
    await createSchema(sql);
    return sql;
};

export { createDatabase };
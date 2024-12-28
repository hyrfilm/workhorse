import {Payload, TaskRow, TaskState} from '@/types';

const schema = `
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

-- CREATE TABLE task queue
CREATE TABLE task_queue (
-- Unique identifier for each task
id INTEGER PRIMARY KEY AUTOINCREMENT,
-- UUID for the task (ensures uniqueness)                     
task_id VARCHAR(36) UNIQUE NOT NULL,
-- The JSON payload of the task                     
task_payload TEXT NOT NULL,
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

--PRAGMA journal_mode=WAL;
`;

function toTaskRow(dbRow: unknown): TaskRow {
    if (dbRow==undefined) {
        throw new Error('Did not get task from db');
    }
    if (typeof dbRow!=="object") {
        throw new Error(`Got unexpected task type from db: ${dbRow}`);
    }
    const dbTask = dbRow as Record<string, any>;
    if ("id" in dbTask && "task_id" in dbTask && "task_payload" in dbTask) {
        return { rowId: dbTask.id, taskId: dbTask.task_id, payload: JSON.parse(dbTask.task_payload) };
    } else {
        throw new Error(`Unexpected task row from db: ${dbTask}`);
    }
}

function addTaskQuery(taskId: string, payload: Payload) {
    const jsonPayload = JSON.stringify(payload);
    return `
        INSERT INTO task_queue (task_id, task_payload, status_id)
        VALUES ('${taskId}', '${jsonPayload}', ${TaskState.queued});
    `;
}

function addTaskIfNotExistsQuery(taskId: string, payload: Payload) {
    const jsonPayload = JSON.stringify(payload);
    return `
        INSERT INTO task_queue (task_id, task_payload, status_id)
        VALUES ('${taskId}', '${jsonPayload}', ${TaskState.queued});
    `;
}

function reserveTaskQuery() {
    return `
        SELECT * FROM task_queue
        WHERE status_id = ${TaskState.queued} -- 'queued'
        ORDER BY id ASC
        LIMIT 1;
    `;
}

function updateTaskStatusQuery(rowId: number, status: number) {
    return `
        UPDATE task_queue
        SET status_id = ${status}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${rowId};
    `;
}

function taskSuccessQuery(rowId: number) {
    return `
        UPDATE task_queue
        SET status_id = ${TaskState.successful},
        completed_at = CURRENT_TIMESTAMP, 
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ${rowId};
    `;
}

function taskFailureQuery(rowId: number) {
    return `
        UPDATE task_queue
        SET status_id = ${TaskState.failed},
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ${rowId};
    `;
}

function requeueFailuresQuery() {
    return `
        UPDATE task_queue
        SET status_id = ${TaskState.queued},
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ${TaskState.failed};
    `;
}

function getSingleStatusQuery(status: number) {
    return `
        SELECT COUNT(*) FROM task_queue
        WHERE status_id = ${status};
    `;
}

export { schema, addTaskQuery, addTaskIfNotExistsQuery, reserveTaskQuery, updateTaskStatusQuery, taskSuccessQuery, taskFailureQuery, requeueFailuresQuery, getSingleStatusQuery, toTaskRow };
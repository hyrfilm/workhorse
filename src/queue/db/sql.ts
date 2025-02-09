import {
  assertTaskQueueRow,
  Payload,
  QueryResult,
  TaskRow,
  TaskState,
} from '@/types.ts';

const schema = `
-- When a task returns something other than undefined it is turned into JSON and stored here
CREATE TABLE task_result (id VARCHAR(36) PRIMARY KEY, result TEXT);

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

CREATE TABLE task_queue (
-- Datbase row id
id INTEGER PRIMARY KEY AUTOINCREMENT,
-- User specified string that uniquely identifies a task                   
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
  assertTaskQueueRow(dbRow);
  return {
    id: dbRow.id,
    taskId: dbRow.task_id,
    payload: JSON.parse(dbRow.task_payload) as Payload,
  } as TaskRow;
}

function addTaskQuery(taskId: string, payload: Payload): string {
  const jsonPayload = JSON.stringify(payload);
  return `
        INSERT INTO task_queue (task_id, task_payload, status_id)
        VALUES ('${taskId}', '${jsonPayload}', ${TaskState.queued});
    `;
}

function addTaskIfNotExistsQuery(taskId: string, payload: Payload): string {
  const jsonPayload = JSON.stringify(payload);
  return `
        INSERT OR IGNORE INTO task_queue (task_id, task_payload, status_id)
        VALUES ('${taskId}', '${jsonPayload}', ${TaskState.queued});
    `;
}

function reserveTaskAtomic(): string {
  return `
      UPDATE task_queue
      SET
        status_id = ${TaskState.executing},
        updated_at = CURRENT_TIMESTAMP
      WHERE id IN (
        SELECT id
        FROM task_queue
        WHERE status_id = ${TaskState.queued}
        ORDER BY id ASC
        LIMIT 1
      )
      RETURNING *;
    `;
}

function reserveTaskQuery(): string {
  return `
        SELECT * FROM task_queue
        WHERE status_id = ${TaskState.queued} -- 'queued'
        ORDER BY id ASC
        LIMIT 1;
    `;
}

function updateTaskStatusQuery(rowId: number, status: number): string {
  return `
        UPDATE task_queue
        SET status_id = ${status}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${rowId};
    `;
}

function taskSuccessQuery(rowId: number): string {
  return `
        UPDATE task_queue
        SET status_id = ${TaskState.successful},
        completed_at = CURRENT_TIMESTAMP, 
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ${rowId};
    `;
}

function taskFailureQuery(rowId: number): string {
  return `
        UPDATE task_queue
        SET status_id = ${TaskState.failed},
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ${rowId};
    `;
}

function requeueFailuresQuery(): string {
  return `
        UPDATE task_queue
        SET status_id = ${TaskState.queued},
        updated_at = CURRENT_TIMESTAMP
        WHERE status_id = ${TaskState.failed};
    `;
}

function getSingleStatusQuery(status: number): string {
  return `
        SELECT COUNT(*) FROM task_queue
        WHERE status_id = ${status};
    `;
}

function getAllStatusQuery(): string {
  return `SELECT status_id, COUNT(*) AS count
            FROM task_queue
            GROUP BY status_id;
    `;
}

interface StatusQuery extends QueryResult {
  status_id: number;
  count: number;
}

export {
  schema,
  addTaskQuery,
  addTaskIfNotExistsQuery,
  reserveTaskQuery,
  reserveTaskAtomic,
  updateTaskStatusQuery,
  taskSuccessQuery,
  taskFailureQuery,
  requeueFailuresQuery,
  getSingleStatusQuery,
  getAllStatusQuery,
  toTaskRow,
};
export type { StatusQuery };

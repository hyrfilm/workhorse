/*
-- NARROW SCOPE

-- Step 1: Fetch the next task
BEGIN TRANSACTION;
SELECT * FROM task_queue
WHERE status_id = 1
ORDER BY created_at ASC
LIMIT 1;
COMMIT;

-- Step 2: Mark the task as executing
BEGIN TRANSACTION;
UPDATE task_queue
SET status_id = 2, updated_at = CURRENT_TIMESTAMP
WHERE id = :task_id;
COMMIT;

-- Step 3: Mark the task as successful
BEGIN TRANSACTION;
UPDATE task_queue
SET status_id = 3, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = :task_id;
COMMIT;
*/

/*
-- BROAD SCOPE

BEGIN TRANSACTION;

-- Step 1: Fetch and reserve the next task
UPDATE task_queue
SET status_id = 2, updated_at = CURRENT_TIMESTAMP
WHERE id = (
    SELECT id FROM task_queue
    WHERE status_id = 1
    ORDER BY created_at ASC
    LIMIT 1
);

-- Step 2: Process the task (handled by application logic outside SQL)

-- Step 3: Mark the task as successful
UPDATE task_queue
SET status_id = 3, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = :task_id;

COMMIT;
*/


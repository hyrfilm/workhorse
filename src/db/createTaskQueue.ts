import { SqlExecutor, TaskQueue, RowId, TaskState } from '@/types';

function createTaskQueue(sqlExecutor: SqlExecutor): TaskQueue {
    const sql = sqlExecutor;

    return {
        addTask: async(taskId, payload) => {
            await sql
            `
            INSERT INTO task_queue (task_id, task_payload, status_id)
            VALUES (${taskId}, ${payload}, ${TaskState.queued});
            `
            ;
        },
        reserveTask: async () => {
            const maybeTaskRow = await sql
            `
            -- fetch the next task
            SELECT * FROM task_queue
            WHERE status_id = 1 -- 'queued'
            ORDER BY id ASC
            LIMIT 1;
            `
            ;
            if (!maybeTaskRow) {
                return undefined;
            }
            if (maybeTaskRow?.length!==1) {
                return undefined;
            }
            const taskRow = maybeTaskRow[0];
            await sql
            `
            -- mark as executing
            UPDATE task_queue
            SET status_id = 2, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${taskRow.id};
            `
            ;
            return { rowId: taskRow.id, taskRow: taskRow };
        },
        taskSuccessful: async (taskId: RowId) => {
            await sql
            `
            -- mark as successful
            UPDATE task_queue
            SET status_id = ${TaskState.successful},
            completed_at = CURRENT_TIMESTAMP, 
            updated_at = CURRENT_TIMESTAMP
            WHERE id = ${taskId};        
            `
            ;
        },
        taskFailed: async (taskId) => {
            await sql
            `
            -- mark as successful
            UPDATE task_queue
            SET status_id = ${TaskState.failed},
            completed_at = CURRENT_TIMESTAMP, 
            updated_at = CURRENT_TIMESTAMP
            WHERE id = ${taskId};        
            `
            ;
        },
        countStatus: async(status: TaskState) => {
            const records = await sql
            `
            SELECT COUNT(*) FROM task_queue
            where status_id = ${status};
            `
            ;
            return records[0]['COUNT(*)'];
        },
    };
};

export { createTaskQueue };

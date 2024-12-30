import {
    Payload,
    QueueStatus,
    TaskQueue,
    TaskRow,
    TaskState,
    DuplicateStrategy,
    WorkhorseConfig,
    RunQuery,
    assertTaskRow
} from '@/types';
import {
    addTaskQuery,
    taskSuccessQuery,
    taskFailureQuery,
    getSingleStatusQuery,
    toTaskRow,
    requeueFailuresQuery,
    addTaskIfNotExistsQuery,
    reserveTaskAtomic as reserveTaskAtomicQuery,
} from './sql';
import {DuplicateTaskError} from "@/errors.ts";

function createTaskQueue(config: WorkhorseConfig, sql: RunQuery): TaskQueue {
    const taskQueue = {
        addTask: async (taskId: string, payload: Payload) => {
            let query = "";
            switch(config.duplicates) {
                case DuplicateStrategy.FORBID:
                    query = addTaskQuery(taskId, payload);
                    break;
                case DuplicateStrategy.IGNORE:
                    query = addTaskIfNotExistsQuery(taskId, payload);
                    break;
                default:
                    query = "This should not be possible" as never;
            }
            try {
                await sql(query);
            } catch(e) {
                if (e instanceof Error) {
                    if ("code" in e) {
                        if (e.code==="SQLITE_CONSTRAINT_UNIQUE") {
                            throw new DuplicateTaskError(`Duplicate task: ${taskId}`);
                        }
                    }
                }
            }
        },
        reserveTask: async () => {
            const reserveQuery = reserveTaskAtomicQuery();
            const updatedRows = await sql(reserveQuery);

            if (updatedRows.length !== 1) {
              return undefined;
            }
          
            const dbRow = updatedRows[0];
            assertTaskRow(dbRow);  // your domain logic check
            return toTaskRow(dbRow);
          },
        taskSuccessful: async (taskRow: TaskRow) => {
            const query = taskSuccessQuery(taskRow.id);
            await sql(query);
        },
        taskFailed: async (taskRow: TaskRow) => {
            const query = taskFailureQuery(taskRow.id);
            await sql(query);
        },
        requeue: async (): Promise<undefined> => {
            const query = requeueFailuresQuery();
            await sql(query);
        },
        queryTaskCount: async (status: TaskState): Promise<number> => {
            const query = getSingleStatusQuery(status);
            const records = await sql(query);

            const record = records[0];
            const key = 'COUNT(*)';
            if (key in record && record[key]!=="number") {
                return record[key] as number;
            } else {
                const shouldNotHappen : never = 'Should not happen' as never;
                throw new Error(shouldNotHappen);
            }
        },
        getStatus: async (): Promise<QueueStatus> => {
            const queued = await taskQueue.queryTaskCount(TaskState.queued);
            const executing = await taskQueue.queryTaskCount(TaskState.executing);
            const successful = await taskQueue.queryTaskCount(TaskState.successful);
            const failed = await taskQueue.queryTaskCount(TaskState.failed);

            return { queued, executing, successful, failed };
        }
    };

    return taskQueue;
}

export { createTaskQueue };

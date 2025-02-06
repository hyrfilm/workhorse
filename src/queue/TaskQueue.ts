// @ts-nocheck
// TODO: Fix temporary ts-ignore
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
} from '@/types.ts';
import {
    addTaskQuery,
    taskSuccessQuery,
    taskFailureQuery,
    getSingleStatusQuery,
    toTaskRow,
    requeueFailuresQuery,
    addTaskIfNotExistsQuery,
    reserveTaskAtomic as reserveTaskAtomicQuery,
    getAllStatusQuery,
} from './db/sql';
import {DuplicateTaskError, UnreachableError} from "@/errors.ts";

function createTaskQueue(config: WorkhorseConfig, sql: RunQuery): TaskQueue {
    const taskQueue : TaskQueue = {
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
            assertTaskRow(dbRow);
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
            const query = getAllStatusQuery();
            const records = await sql(query);
            
            // Start with default counts
            const queueStatus: QueueStatus = {
                queued: 0,
                executing: 0,
                successful: 0,
                failed: 0,
            };
        
            // Map records to QueueStatus
            records.forEach((record) => {
                if (typeof record.status_id !== "number" || typeof record.count !== "number") {
                    throw new UnreachableError(record as never, `Invalid record structure: ${JSON.stringify(record)}`);
                }

                switch (record.status_id) {
                    case TaskState.queued:
                        queueStatus.queued = record.count;
                        break;
                    case TaskState.executing:
                        queueStatus.executing = record.count;
                        break;
                    case TaskState.successful:
                        queueStatus.successful = record.count;
                        break;
                    case TaskState.failed:
                        queueStatus.failed = record.count;
                        break;
                    default:
                        throw new UnreachableError(record.status_id as never, `Unexpected status_id: ${record.status_id}`);
                }
            });
        
        return queueStatus;
        },
    };

    return taskQueue;
};

export { createTaskQueue };

/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
// TODO: Fix switch statement so this eslint-disable can be removed
import {
  Payload,
  QueueStatus,
  TaskQueue,
  TaskRow,
  TaskState,
  DuplicateStrategy,
  WorkhorseConfig,
  RunQuery,
  assertTaskRow,
  QueryResult,
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
  StatusQuery,
} from './db/sql';
import { DuplicateTaskError, UnreachableError } from '@/errors.ts';
import { Emitter, Notifications } from "@events";

function createTaskQueue(config: WorkhorseConfig, sql: RunQuery): TaskQueue {
  const taskQueue: TaskQueue = {
    addTask: async (taskId: string, payload: Payload) => {
      let query = '';
      switch (config.duplicates) {
        case DuplicateStrategy.FORBID:
          query = addTaskQuery(taskId, payload);
          break;
        case DuplicateStrategy.IGNORE:
          query = addTaskIfNotExistsQuery(taskId, payload);
          break;
        default:
          query = 'This should not be possible' as never;
      }
      try {
        await sql(query);
        Emitter.emit(Notifications.Task.Added, { taskId });
      } catch (e) {
        if (e instanceof Error) {
          if ('code' in e) {
            if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
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
      Emitter.emit(Notifications.Task.Success, { taskId: taskRow.taskId });
    },
    taskFailed: async (taskRow: TaskRow) => {
      const query = taskFailureQuery(taskRow.id);
      await sql(query);
      Emitter.emit(Notifications.Task.Failure, { taskId: taskRow.taskId });
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
      if (key in record && record[key] !== 'number') {
        return record[key] as number;
      } else {
        const shouldNotHappen: never = 'Should not happen' as never;
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
        assertStatusQuery(record);
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
            throw new UnreachableError(
              record.status_id as never,
              `Unexpected status_id: ${record.status_id}`
            );
        }
      });

      return queueStatus;
    },
  };

  return taskQueue;
}

function assertStatusQuery(maybeQueueStatus: QueryResult): asserts maybeQueueStatus is StatusQuery {
  if (!('status_id' in maybeQueueStatus))
    throw Error(`Expected status_id in ${JSON.stringify(maybeQueueStatus)}`);
  if (!('count' in maybeQueueStatus))
    throw Error(`Expected count in ${JSON.stringify(maybeQueueStatus)}`);
}

export { createTaskQueue };

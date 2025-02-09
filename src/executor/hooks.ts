import {
  assertTaskRow,
  RunTask,
  TaskQueue,
  TaskRow,
  TaskHooks,
  WorkhorseConfig,
  Payload,
} from '@/types.ts';
import log from 'loglevel';
import { ReservationFailed } from '@/errors.ts';

const createExecutorHooks = (
  _config: WorkhorseConfig,
  queue: TaskQueue,
  run: RunTask
): TaskHooks => {
  let task: undefined | TaskRow = undefined;
  return {
    reserveHook: async (): Promise<void> => {
      log.debug(`Reserving task...`);
      task = await queue.reserveTask();
      if (!task) {
        log.debug('No reservation');
        throw new ReservationFailed('No reservation');
      } else {
        assertTaskRow(task);
        log.debug(`Reserved task: ${task.taskId}`);
      }
    },
    executeHook: async (): Promise<void> => {
      assertTaskRow(task);
      log.debug(`Task running: ${task.taskId}`);
      const maybePayload = await run(task.taskId, task.payload);
      if (maybePayload) {
        const payload: Payload = JSON.stringify(maybePayload);
        await queue.updateTaskResult(task.taskId, payload);
      }
    },
    successHook: async (): Promise<void> => {
      assertTaskRow(task);
      log.debug(`Task successful: ${task.taskId}`);
      await queue.taskSuccessful(task);
    },
    failureHook: async (): Promise<void> => {
      assertTaskRow(task);
      log.debug(`Task failed: ${task.taskId}`);
      await queue.taskFailed(task);
    },
  };
};

export { createExecutorHooks };

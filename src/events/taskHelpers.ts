import { Notifications } from '@/events/eventTypes.ts';
import { EventEmitter } from 'eventemitter3';

const InternalEmitter = createInternalEmitter();

const taskIdSuccess = (taskId: string): string => {
  return `${Notifications.TaskId.Success}${taskId}`;
};

//TODO: Is there a use-case for this?
/*
const taskIdFailure = (taskId: string): string => {
  return `${Notifications.TaskId.Failure}${taskId}`;
};
*/
const emitReturnValue = (taskId: string, ...returnValue: unknown[]): void => {
  InternalEmitter.emitAnything(taskIdSuccess(taskId), ...returnValue);
};

const waitForReturnValue = (taskId: string): Promise<unknown[]> => {
  return new Promise((resolve) => {
    InternalEmitter.once(taskIdSuccess(taskId), (args) => {
      resolve(args);
    });
  });
};

// Note: don't use this object.
// If you do, things may break in surprising ways.
// Its sole unexcited purpose is to facilitate the functions in this file.
// The reason this object exists is to handle the scenario when someone subscribes to the
// result of a task, and wants to know the exact return value.
// And the person creating the task can decide to return literally anything.
// If that anything isn't serializable to JSON, the result of the task will not be persisted.
// But this allows one to at least receive the result as the task finishes its execution.
function createInternalEmitter() {
  const eventEmitter = new EventEmitter();
  type callback = (args: unknown[]) => void;
  return {
    once: (event: string, fn: callback) => {
      eventEmitter.once(event, fn);
    },
    emitAnything: (event: string, ...args: unknown[]) => {
      eventEmitter.emit(event, ...args);
    },
  } as const;
}

export { emitReturnValue, waitForReturnValue };

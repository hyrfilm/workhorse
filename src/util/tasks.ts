import { TaskResult } from '@/types.ts';
import { Emitter } from '@/events/emitter.ts';
import { taskIdSuccess } from '@/events/helpers.ts';

const waitForTaskResult = (taskId: string): Promise<TaskResult> => {
  return new Promise((resolve) => {
    Emitter.once(taskIdSuccess(taskId), (payload) => {
      resolve(payload);
    });
  });
};

export { waitForTaskResult };

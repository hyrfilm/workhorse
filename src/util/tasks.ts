import { Payload } from '@/types.ts';
import { Emitter } from '@/events/emitter.ts';
import { taskIdSuccess } from '@/events/helpers.ts';

const waitForTaskResult = (taskId: string): Promise<Payload | undefined> => {
  return new Promise((resolve) => {
    Emitter.once(taskIdSuccess(taskId), (payload) => {
      resolve(payload);
    });
  });
};

export { waitForTaskResult };

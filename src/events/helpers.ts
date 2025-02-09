import { Notifications } from '@/events/eventTypes.ts';

const taskIdSuccess = (taskId: string): string => {
  return `${Notifications.TaskId.Success}${taskId}`;
};

const taskIdFailure = (taskId: string): string => {
  return `${Notifications.TaskId.Failure}${taskId}`;
};

export { taskIdSuccess, taskIdFailure };

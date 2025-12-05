import { TaskState, WorkhorsePlugin } from '@/types';
import { Emitter, Notifications } from '@events';
import { debug } from '@/util/logging.ts';

interface Task {
  taskId: string;
  status: TaskState;
}

class QueueVisualizer implements WorkhorsePlugin {
  public name = 'QueueVisualizer';
  private tasks: Task[] = [];
  private taskIndex: Record<string, number> = {};
  private bc = new BroadcastChannel('matrix-viz');

  private notifyVisualizer = () => {
    this.bc.postMessage({ type: 'tasks', tasks: this.tasks });
  };

  private idx = (taskId: string): number => {
    return this.taskIndex[taskId];
  };

  public add = (payload: { taskId: string }): void => {
    const task = createTask(payload.taskId, TaskState.queued);
    this.taskIndex[payload.taskId] = this.tasks.push(task) - 1;
    this.notifyVisualizer();
  };

  public reserve = (payload: { taskId: string }): void => {
    // strictly speaking not correct but whatevzzzzz
    this.tasks[this.idx(payload.taskId)].status = TaskState.executing;
    this.notifyVisualizer();
  };

  public success = (payload: { taskId: string }): void => {
    this.tasks[this.idx(payload.taskId)].status = TaskState.successful;
    this.notifyVisualizer();
  };

  public failure = (payload: { taskId: string }): void => {
    this.tasks[this.idx(payload.taskId)].status = TaskState.failed;
    this.notifyVisualizer();
  };

  onStart(): void {
    debug(this.name, ' starting');
    Emitter.on(Notifications.Task.Added, this.add);
    Emitter.on(Notifications.Task.Reserved, this.reserve);
    Emitter.on(Notifications.Task.Success, this.success);
    Emitter.on(Notifications.Task.Failure, this.failure);
  }

  onStop(): void {
    debug(this.name, ' stopping');
    Emitter.off(Notifications.Task.Failure, this.failure);
    Emitter.off(Notifications.Task.Success, this.success);
    Emitter.off(Notifications.Task.Reserved, this.reserve);
    Emitter.off(Notifications.Task.Added, this.add);
  }
}

const createTask = (taskId: string, status: TaskState) => {
  return { taskId, status };
};

export { QueueVisualizer };

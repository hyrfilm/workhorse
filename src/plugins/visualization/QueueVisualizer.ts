import { TaskState, WorkhorsePlugin } from '@/types';
import { Emitter, Notifications } from '@events';
import { debug } from '@/util/logging.ts';

const VIZ_CHANNEL = 'matrix-viz';

interface Task {
  taskId: string;
  status: TaskState;
}

type VizMessage = { type: 'tasks'; tasks: Task[] } | { type: 'state:request' };

class QueueVisualizer implements WorkhorsePlugin {
  public name = 'QueueVisualizer';
  private tasks: Task[] = [];
  private taskIndex: Record<string, number> = {};
  private bc?: BroadcastChannel;

  private notifyVisualizer = () => {
    const message: VizMessage = { type: 'tasks', tasks: this.tasks };
    this.bc?.postMessage(message);
  };

  private setStatus = (taskId: string, status: TaskState): void => {
    if (!(taskId in this.taskIndex)) {
      // Tasks from other workhorse instances on the shared emitter
      debug(this.name, ` ignoring unknown task: ${taskId}`);
      return;
    }
    this.tasks[this.taskIndex[taskId]].status = status;
    this.notifyVisualizer();
  };

  public add = (payload: { taskId: string }): void => {
    const task = createTask(payload.taskId, TaskState.queued);
    this.taskIndex[payload.taskId] = this.tasks.push(task) - 1;
    this.notifyVisualizer();
  };

  public reserve = (payload: { taskId: string }): void => {
    this.setStatus(payload.taskId, TaskState.executing);
  };

  public success = (payload: { taskId: string }): void => {
    this.setStatus(payload.taskId, TaskState.successful);
  };

  public failure = (payload: { taskId: string }): void => {
    this.setStatus(payload.taskId, TaskState.failed);
  };

  onStart(): void {
    debug(this.name, ' starting');
    this.bc = new BroadcastChannel(VIZ_CHANNEL);
    this.bc.onmessage = (event: MessageEvent<VizMessage>) => {
      if (event.data.type === 'state:request') {
        this.notifyVisualizer();
      }
    };
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
    this.bc?.close();
    this.bc = undefined;
  }
}

const createTask = (taskId: string, status: TaskState): Task => {
  return { taskId, status };
};

export { QueueVisualizer, VIZ_CHANNEL };
export type { Task, VizMessage };

import { WorkhorsePlugin, EventPayload } from '@/types';
import { Emitter, Notifications } from '@events';
import { Subscriptions } from '@/events/eventTypes.ts';
import {debug} from "@/util/logging.ts";

function clamp(num: number, lower: number, upper: number) {
  return Math.min(Math.max(num, lower), upper);
}

class TaskMonitor implements WorkhorsePlugin {
  public name = 'TaskMonitor';
  private allTaskIds = new Set();
  private remainingTaskIds = new Set();
  private notify = () => {
    const total = this.allTaskIds.size;
    const remaining = this.remainingTaskIds.size;
    const progress = clamp(remaining, 0, remaining) / clamp(total, 1, total);
    Emitter.emit(Subscriptions.TaskMonitor.Updated, { total, remaining, progress });
  };

  public add = (event: EventPayload): void => {
    this.allTaskIds.add(event.taskId);
    this.remainingTaskIds.add(event.taskId);
    this.notify();
  };

  public remove = (event: EventPayload): void => {
    this.remainingTaskIds.delete(event.taskId);
    this.notify();
  };

  onStart(): void {
    debug(this.name, ' starting');
    Emitter.on(Notifications.Task.Added, this.add);
    Emitter.on(Notifications.Task.Success, this.remove);
  }

  onStop(): void {
    Emitter.off(Notifications.Task.Added, this.add);
    Emitter.off(Notifications.Task.Success, this.remove);
  }
}

export { TaskMonitor };

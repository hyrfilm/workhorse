import { WorkhorsePlugin, EventPayload, CommandDispatcher } from '@/types';
import { Emitter, Notifications } from '@events';
import { Subscriptions } from '@/events/eventTypes.ts';
import {debug} from "@/util/logging.ts";

class TaskMonitor implements WorkhorsePlugin {
  public name = 'TaskMonitor';
  private allTaskIds = new Set();
  private remainingTaskIds = new Set();
  private notify = () => {
    const total = this.allTaskIds.size;
    const remaining = this.remainingTaskIds.size;
    let progress = 0;
    if (total > 0) {
      progress = (total - remaining) / total;
    }
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

  onStart(_dispatcher: CommandDispatcher): void {
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

import {WorkhorsePlugin, PluginConfig, EventPayload} from '@/types';
import {Notifications} from '@events';
import * as stubs from './util/stubs.ts';

class TaskCount implements WorkhorsePlugin {
    public name = 'TaskCount';
    public taskIds = new Set();

    private emitter = stubs.emitter;

    public add = (event: EventPayload): void => {
        this.taskIds.add(event.taskId);
    };

    public remove = (event: EventPayload): void => {
        this.taskIds.delete(event.taskId);
    };

    onStart(config: PluginConfig): void {
        this.emitter = config.emitter;
        this.emitter.on(Notifications.Task.Added, this.add);
        this.emitter.on(Notifications.Task.Success, this.remove);
    };

    onStop(): void {
        this.emitter.off(Notifications.Task.Added, this.add);
        this.emitter.off(Notifications.Task.Success, this.remove);
    };
}

export { TaskCount };

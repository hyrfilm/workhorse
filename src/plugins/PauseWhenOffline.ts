import { WorkhorsePlugin, PluginConfig } from '@/types';
import { Emitter, Actions } from '@events';
import * as stubs from './util/stubs.ts';

class PauseWhenOffline implements WorkhorsePlugin {
  public name = 'PauseWhenOffline';

  private online;
  private emitter = stubs.emitter;
  private log = stubs.log;

  constructor() {
    this.online = true;
    this.emitter = Emitter;
  }

  onStart = (config: PluginConfig): void => {
    this.log = config.log;
    this.emitter = config.emitter;

    this.online = navigator.onLine;
    if (!this.online) {
      this.handleOffline();
    }

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  };

  onStop = (): void => {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  };

  handleOnline = (): void => {
    this.log('info', 'Online - processing queue');
    this.emitter.emit(Actions.Executors.Start);
  };

  handleOffline = (): void => {
    this.log('info', 'Offline - pause processing queue');
    this.emitter.emit(Actions.Executors.Stop);
  };
}

export { PauseWhenOffline };

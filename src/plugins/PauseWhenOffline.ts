import { WorkhorsePlugin } from '@/types';
import { Emitter, Actions } from '@events';
import { debug } from '@/util/logging.ts';

class PauseWhenOffline implements WorkhorsePlugin {
  public name = 'PauseWhenOffline';

  private online;

  constructor() {
    this.online = true;
  }

  onStart = (): void => {
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
    debug('Online - processing queue');
    Emitter.emit(Actions.Executors.Start, []);
  };

  handleOffline = (): void => {
    debug('Offline - pause processing queue');
    Emitter.emit(Actions.Executors.Stop, []);
  };
}

export { PauseWhenOffline };

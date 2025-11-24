import { WorkhorsePlugin } from '@/types';
import { Emitter, Actions } from '@events';
import { debug } from '@/util/logging.ts';

class PauseWhenOffline implements WorkhorsePlugin {
  public name = 'PauseWhenOffline';

  private listening = false;

  onStart = (): void => {
    if (this.listening) return;
    this.listening = true;

    if (!navigator.onLine) {
      this.pausePoller();
    }

    window.addEventListener('online', this.resumePoller);
    window.addEventListener('offline', this.pausePoller);
  };

  onStop = (): void => {
    if (!this.listening) return;
    this.listening = false;

    window.removeEventListener('online', this.resumePoller);
    window.removeEventListener('offline', this.pausePoller);
  };

  private resumePoller = (): void => {
    debug('Online - processing queue');
    Emitter.emit(Actions.Poller.Resume, []);
  };

  private pausePoller = (): void => {
    debug('Offline - pause processing queue');
    Emitter.emit(Actions.Poller.Pause, []);
  };
}

export { PauseWhenOffline };

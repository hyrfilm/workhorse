/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { PauseWhenOffline } from '@/plugins/PauseWhenOffline.ts';
import { Actions, Emitter } from '@events';

const originalOnline = navigator.onLine;

const setNavigatorOnline = (value: boolean): void => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
};

describe('PauseWhenOffline', () => {
  const recorded: { type: string }[] = [];

  const recordPause = () => recorded.push({ type: Actions.Poller.Pause });
  const recordResume = () => recorded.push({ type: Actions.Poller.Resume });

  beforeEach(() => {
    recorded.length = 0;
    setNavigatorOnline(true);
    Emitter.on(Actions.Poller.Pause, recordPause);
    Emitter.on(Actions.Poller.Resume, recordResume);
  });

  afterEach(() => {
    setNavigatorOnline(originalOnline);
    Emitter.off(Actions.Poller.Pause, recordPause);
    Emitter.off(Actions.Poller.Resume, recordResume);
  });

  test('emits pause immediately when starting offline', () => {
    setNavigatorOnline(false);
    const plugin = new PauseWhenOffline();

    plugin.onStart();

    expect(recorded).toEqual([{ type: Actions.Poller.Pause}]);
    plugin.onStop();
  });

  test('emits pause/resume on connectivity changes and unsubscribes on stop', () => {
    const plugin = new PauseWhenOffline();

    plugin.onStart();

    window.dispatchEvent(new Event('offline'));
    expect(recorded).toEqual([{ type: Actions.Poller.Pause, }]);

    recorded.length = 0;
    window.dispatchEvent(new Event('online'));
    expect(recorded).toEqual([{ type: Actions.Poller.Resume}]);

    plugin.onStop();

    recorded.length = 0;
    window.dispatchEvent(new Event('offline'));
    expect(recorded).toEqual([]);
  });
});

/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { PauseWhenOffline } from '@/plugins/PauseWhenOffline.ts';
import { Actions } from '@events/eventTypes.ts';
import { Emitter } from '@events/emitter.ts';

const setNavigatorOnline = (value: boolean): void => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
};

describe('PauseWhenOffline', () => {
  const originalOnline = navigator.onLine;
  const recorded: Array<{ type: 'start' | 'stop'; payload: [] }> = [];
  const onStart = (payload: []): void => recorded.push({ type: 'start', payload });
  const onStop = (payload: []): void => recorded.push({ type: 'stop', payload });

  beforeEach(() => {
    recorded.length = 0;
    setNavigatorOnline(true);
    Emitter.on(Actions.Executors.Start, onStart);
    Emitter.on(Actions.Executors.Stop, onStop);
  });

  afterEach(() => {
    setNavigatorOnline(originalOnline);
    Emitter.off(Actions.Executors.Start, onStart);
    Emitter.off(Actions.Executors.Stop, onStop);
  });

  test('emits stop immediately when starting offline', () => {
    setNavigatorOnline(false);
    const plugin = new PauseWhenOffline();

    plugin.onStart();

    expect(recorded).toEqual([{ type: 'stop', payload: [] }]);
    plugin.onStop();
  });

  test('emits start/stop when connectivity changes and removes listeners on stop', () => {
    const plugin = new PauseWhenOffline();

    plugin.onStart();

    window.dispatchEvent(new Event('offline'));
    expect(recorded).toContainEqual({ type: 'stop', payload: [] });

    recorded.length = 0;
    window.dispatchEvent(new Event('online'));
    expect(recorded).toEqual([{ type: 'start', payload: [] }]);

    plugin.onStop();

    recorded.length = 0;
    window.dispatchEvent(new Event('offline'));
    expect(recorded).toEqual([]);
  });
});

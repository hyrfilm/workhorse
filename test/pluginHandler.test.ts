import { describe, expect, test } from 'vitest';
import { createPluginHandler } from '@/pluginHandler.ts';
import { WorkhorsePlugin } from '@types';
import { defaultOptions } from '@/config.ts';

const createPluginStub = (
  name: string,
  onStart: () => void = () => {},
  onStop: () => void = () => {}
): WorkhorsePlugin => ({
  name,
  onStart,
  onStop,
});

describe('pluginHandler', () => {
  test('creates handler without starting plugins', () => {
    const started: string[] = [];
    const pluginA = createPluginStub('a', () => started.push('a'));
    const pluginB = createPluginStub('b', () => started.push('b'));

    createPluginHandler([pluginA, pluginB]);

    expect(started).toEqual([]);
  });

  test('startPlugins returns the provided plugins', () => {
    const pluginA = createPluginStub('a');
    const pluginB = createPluginStub('b');
    const handler = createPluginHandler([pluginA, pluginB]);

    const startedPlugins = handler.startPlugins(defaultOptions());

    expect(startedPlugins).toHaveLength(2);
    expect(startedPlugins[0]).toBe(pluginA);
    expect(startedPlugins[1]).toBe(pluginB);
  });

  test('startPlugins throws when a plugin fails to start', () => {
    const started: string[] = [];
    const pluginA = createPluginStub('a', () => started.push('a'));
    const pluginB = createPluginStub('b', () => {
      throw new Error('boom');
    });
    const handler = createPluginHandler([pluginA, pluginB]);

    expect(() => handler.startPlugins(defaultOptions())).toThrowError(/boom/);
    expect(started).toEqual(['a']);
  });

  test('stopPlugins stops the plugins that were started', () => {
    const events: string[] = [];
    const pluginA = createPluginStub(
      'a',
      () => events.push('start:a'),
      () => events.push('stop:a')
    );
    const pluginB = createPluginStub(
      'b',
      () => events.push('start:b'),
      () => events.push('stop:b')
    );
    const handler = createPluginHandler([pluginA, pluginB]);

    handler.startPlugins(defaultOptions());
    handler.stopPlugins();

    expect(events).toEqual(['start:a', 'start:b', 'stop:a', 'stop:b']);
  });
});

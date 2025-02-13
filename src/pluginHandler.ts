import { Emitter } from './events';
import { createEmitterWithSource, createLogEmitter } from './events/emitterHelpers';
import { WorkhorseConfig, CommandDispatcher, WorkhorsePlugin, EmitLog } from './types';
import { error, log } from './util/logging';

interface PluginHandler {
  startPlugins(config: WorkhorseConfig, dispatcher: CommandDispatcher): void;
  stopPlugins(): void;
}

const configurePlugin = (plugin: WorkhorsePlugin): { log: EmitLog; emitter: Emitter } => {
  const log = createLogEmitter(plugin.name);
  const emitter = createEmitterWithSource(plugin.name);
  return { log, emitter } as const;
};

const createPluginHandler = (): PluginHandler => {
  const plugins: WorkhorsePlugin[] = [];
  return {
    startPlugins: (config: WorkhorseConfig) => {
      config.plugins.forEach((plugin) => {
        const config = configurePlugin(plugin);
        try {
          plugin.onStart(config);
        } catch (e) {
          error(`Plugin ${plugin.name} failed to start: ${e}`);
        }
        log(`Started plugin: ${plugin.name}`);
        plugins.push(plugin);
      });
    },

    stopPlugins: () => {
      plugins.forEach((plugin) => {
        log(`Stopping plugin: ${plugin.name}`);
        plugin.onStop();
      });
      plugins.length = 0;
    },
  };
};

export { createPluginHandler };
export type { PluginHandler };

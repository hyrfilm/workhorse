import { WorkhorseConfig, WorkhorsePlugin } from '@types';
import { error, debug } from './util/logging';

interface PluginHandler {
  startPlugins(config: WorkhorseConfig): void;
  stopPlugins(): void;
}

const createPluginHandler = (): PluginHandler => {
  const plugins: WorkhorsePlugin[] = [];
  return {
    startPlugins: (config: WorkhorseConfig) => {
      config.plugins.forEach((plugin) => {
        try {
          plugin.onStart();
        } catch (e) {
          error(`Plugin ${plugin.name} failed to start: ${e}`);
          throw e;
        }
        debug(`Started plugin: ${plugin.name}`);
        plugins.push(plugin);
      });
    },

    stopPlugins: () => {
      plugins.forEach((plugin) => {
        debug(`Stopping plugin: ${plugin.name}`);
        plugin.onStop();
      });
      plugins.length = 0;
    },
  };
};

export { createPluginHandler };
export type { PluginHandler };

import { WorkhorseConfig, WorkhorsePlugin } from '@types';
import { error, debug } from './util/logging';

interface PluginHandler {
  startPlugins(config: WorkhorseConfig): WorkhorsePlugin[];
  stopPlugins(): void;
}

const createPluginHandler = (plugins: WorkhorsePlugin[]): PluginHandler => {
  return {
    startPlugins: () => {
      return plugins.map((plugin) => {
        try {
          plugin.onStart();
        } catch (e) {
          error(`Plugin ${plugin.name} failed to start: ${e}`);
          throw e;
        }
        debug(`Started plugin: ${plugin.name}`);
        return plugin
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

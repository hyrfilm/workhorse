import { WorkhorseConfig, CommandDispatcher, WorkhorsePlugin } from './types';
import { log } from './util/logging';

interface PluginHandler {
    startPlugins(config: WorkhorseConfig, dispatcher: CommandDispatcher): void;
    stopPlugins(): void;
}

const createPluginHandler = (): PluginHandler => {
    const plugins: WorkhorsePlugin[] = [];

  return {
    startPlugins: (config: WorkhorseConfig, dispatcher: CommandDispatcher) => {
      config.plugins.forEach(plugin => {
        log(`Started plugin: ${plugin.name}`);
        plugin.onStart(dispatcher);
        plugins.push(plugin);
      });
    },

    stopPlugins: () => {
      plugins.forEach(plugin => {
        log(`Stopping plugin: ${plugin.name}`);
        plugin.onStop();
      });
      plugins.length = 0;
    }
  };
};

export { createPluginHandler };
export type { PluginHandler };
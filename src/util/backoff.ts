import {BackoffSettings} from "@/types.ts";

  interface Backoff {
    getBackoff() : number
    increaseBackoff() : void
    resetBackoff() : void
  }
  
  const createBackoff = (config: BackoffSettings) : Backoff => {
    let currentBackoff = config.initial;
  
    return {
      getBackoff: () => currentBackoff,
      increaseBackoff: () => {
        currentBackoff = Math.min(currentBackoff * config.multiplier, config.maxTime);
      },
      resetBackoff: () => {
        currentBackoff = config.initial;
      }
    };
  };

export { createBackoff };
export type { Backoff };

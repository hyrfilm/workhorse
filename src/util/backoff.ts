//TODO: Maybe remove this and just pass the parameters as normal args
interface BackoffConfig {
    initial: number;
    multiplier: number;
    maxTime: number;
  };

  interface Backoff {
    getBackoff() : number
    increaseBackoff() : void
    resetBackoff() : void
  }
  
  const createBackoff = (config: BackoffConfig) : Backoff => {
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

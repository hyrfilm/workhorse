// ConnectivityMonitor.ts

import { CommandDispatcher, WorkhorsePlugin } from "@/types";
import { dummyDispatcher } from "./util/dummyDispatcher";

class PauseWhenOffline implements WorkhorsePlugin {
    private online;
    private dispatcher;
    public name = "PauseWhenOffline";

    constructor() {
      this.online = true;
      this.dispatcher = dummyDispatcher;
    }
    
    onStart = (dispatcher: CommandDispatcher): void => {
      this.online = navigator.onLine;
      this.dispatcher = dispatcher;

      if (!this.online) {
        this.handleOffline();
      }
      
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }

    onStop = (): void => {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }

    handleOnline = (): void => {
      this.dispatcher.log('Online - processing queue');
      this.dispatcher.startExecutors().catch(this.dispatcher.log)
    }

    handleOffline = (): void => {
      this.dispatcher.log('Offline - pause processing queue');
      this.dispatcher.stopExecutors().catch(this.dispatcher.log)
    }
  }
  
  export { PauseWhenOffline };
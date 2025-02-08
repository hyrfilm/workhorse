import { CommandDispatcher, Payload } from "@/types";

const EmptyStatus = { queued: 0, executing: 0, successful: 0, failed: 0 };

const dummyDispatcher : CommandDispatcher = {
    getStatus: () => Promise.resolve(EmptyStatus),
    queue: (_taskId: string, _payload: Payload) => Promise.resolve(EmptyStatus),
    requeue: () => Promise.resolve(EmptyStatus),
    startExecutors: () => Promise.resolve(EmptyStatus),
    stopExecutors: () => Promise.resolve(EmptyStatus),
    poll: () => Promise.resolve(EmptyStatus),
    log: (_s: string) => {},
    shutdown: () => Promise.resolve(EmptyStatus)
  };

  export { dummyDispatcher };
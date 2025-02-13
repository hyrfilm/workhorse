// events received from workhorse
const Notifications = {
  Workhorse: {
    Config: 'workhorse.config',
    Starting: 'workhorse.starting',
    Started: 'workhorse.started',
    Stopping: 'workhorse.stopping',
  },
  Pool: {
    Starting: 'poll.starting',
    Started: 'poll.started',
    Stopping: 'poll.stopping',
  },
  Executor: {
    Started: 'executor.started',
    Stopped: 'executor.stopped',
  },
  // taskId passed as a parameter
  Task: {
    Added: 'task.added',
    Reserved: 'task.reserved',
    Executing: 'task.executing',
    Success: 'task.success',
    Failure: 'task.failre',
  },
  Poller: {
    Started: 'poller.started',
    Stopped: 'poller.Stopped',
  },
  // taskId as suffix of the event name eg 'Task.Completed.[taskId]'
  TaskId: {
    Success: 'taskid.success.',
    Failure: 'taskid.failure.',
  },
} as const;

// events sent to workhorse
const Actions = {
  Log: 'log',
  Executors: {
    Start: 'Executors.Start',
    Stop: 'Executors.Stop',
  },
  Poller: {
    Start: 'start',
    Stop: 'stop',
  },
} as const;

// If T is an object, it maps over its keys and recursively applies DeepValue to each value.
// Finally, it indexes into the resulting mapped type with [keyof T] to form a union of all values.
// If T is not an object (i.e. it’s a string), it just returns T.
type DeepValue<T> = T extends object ? { [K in keyof T]: DeepValue<T[K]> }[keyof T] : T;

type NotificationEvents = DeepValue<typeof Notifications>;
type ActionEvents = DeepValue<typeof Actions>;

type Event = NotificationEvents | ActionEvents;

export { Notifications, Actions };
export type { Event };

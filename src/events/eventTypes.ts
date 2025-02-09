// events received from workhorse
const Notifications = {
  // taskId passed as a parameter
  Task: {
    //TODO:
    /*
        success: 'task.success',
        fail: 'task.failure',
        */
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
} as const;

/*
enum Actions {
    start_executors = 'start_executors',
    stop_executors = 'stop_executors',
    start_poller = 'start_poller',
    stop_poller = 'stop_poller',
    log = 'log', //TODO: should include a level!
}

enum Notifications {
    task_updated = 'task_updated',
    queue_updated = 'queue_updated',
    executors_started = 'executors_started',
    executors_stopped = 'executors_stopped',
    poller_started = 'poller_started',
    poller_stopped = 'poller_stopped',
    poll = 'poll',
    requeue = 'requeue',
    backing_off = 'backing_off',
    queue_empty = 'queue_empty', // TODO: could be problematic, maybe sentinel events should be added
    started = 'started',
    stopped = 'stopped',
}
*/

export { Notifications, Actions };

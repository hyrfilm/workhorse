// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlExecutor = <Result extends Record<string, any>>(
    queryTemplate: TemplateStringsArray | string,
    ...params: unknown[]
  ) => Promise<Result[]>;

enum TaskState {
    queued      = 1,
    executing   = 2,
    successful  = 3,
    failed      = 4,
}

type RowId = number;

interface TaskRow {
    rowId: RowId;
    taskId: string;
    payload: Payload;
}


// TODO: Combine TaskProducer, TaskConsumer, TaskQueue -> TaskQueue
interface TaskProducer {
    addTask(taskId: string, payload: Payload) : Promise<void>;
}

interface TaskConsumer {
    reserveTask() : Promise<TaskRow | undefined>;
    taskSuccessful(taskRow: TaskRow) : Promise<void>;
    taskFailed(taskRow: TaskRow): Promise<void>;
}

interface TaskQueue extends TaskProducer, TaskConsumer {
    countStatus(status: TaskState): Promise<number>;
}

interface TaskRunner {
    executeHook: () => Promise<void>;
    successHook: () => Promise<void>;
    reserveHook: () => Promise<void>;
    failureHook: () => Promise<void>
}

type JSONPrimitive = string | number | boolean | null;
type JSONObject = { [key: string]: JSONValue };
type JSONArray = JSONValue[];
type JSONValue = JSONPrimitive | JSONObject | JSONArray;

type Payload = JSONValue;

type RunTask = (taskId: string, payload: Payload) => Promise<void>;

interface BackoffSettings {
    initial: number;
    multiplier: number;
    maxTime: number;
}

interface WorkhorseConfig {
    backoff: BackoffSettings;
}

function assertTaskRow(maybeTaskRow: TaskRow | undefined): asserts maybeTaskRow is TaskRow {
    if (maybeTaskRow===undefined) {
        throw new Error('Invalid TaskRow (missing)');
    }
    if (typeof maybeTaskRow?.rowId!=="number") {
        throw new Error(`Invalid rowId: ${maybeTaskRow?.rowId}`);
    }
    if (typeof maybeTaskRow?.taskId!=="string") {
        throw new Error(`Invalid taskId: ${maybeTaskRow?.taskId}`);
    }
    if (typeof maybeTaskRow?.payload!=="object") {
        throw new Error(`Invalid payload: ${maybeTaskRow?.payload}`);
    }
}

export type { SqlExecutor, RowId, TaskRow, TaskConsumer, TaskProducer, TaskQueue, Payload, RunTask, TaskRunner, WorkhorseConfig, BackoffSettings };
export { TaskState, assertTaskRow };

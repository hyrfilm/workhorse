// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlExecutor = (queryTemplate: TemplateStringsArray | string, ...params: unknown[]) => Promise<QueryResult[]>;
type QueryResult = Record<string, string | number | null>[];
type RunQuery = (query: string) => Promise<QueryResult[]>; 

enum TaskState {
    queued      = 1,
    executing   = 2,
    successful  = 3,
    failed      = 4,
}

type RowId = number;

interface TaskRow {
    id: RowId;
    taskId: string;
    payload: Payload;
}

interface WorkhorseStatus {
    queued: number;
    completed: number;
    successful: number;
    failed: number;
}

interface TaskQueue {
    addTask(taskId: string, payload: Payload) : Promise<void>;
    reserveTask() : Promise<TaskRow | undefined>;
    taskSuccessful(taskRow: TaskRow) : Promise<void>;
    taskFailed(taskRow: TaskRow): Promise<void>;
    requeue: () => Promise<void>;
    queryTaskCount(status: TaskState): Promise<number>;
    getStatus(): Promise<QueueStatus>;
}

enum DuplicateStrategy {
    // if a task is added with an id that already exist ignore it
    IGNORE = 'ignore',
    // if a task is added with an id that already throw an error
    FORBID = 'forbid',
}

interface TaskRunner {
    executeHook: () => Promise<void>;
    successHook: () => Promise<void>;
    reserveHook: () => Promise<void>;
    failureHook: () => Promise<void>;
}

// Operations possible both on a single TaskExecutor and an arbitrary group of them
interface TaskExecutorPool {
    startAll(): Promise<void>;
    stopAll(): Promise<void>;
    pollAll(): Promise<void>;
}

// Operations possible on a single TaskExecutor
interface SingleTaskExecutor {
    start(): void;
    stop(): void;
    poll(): void;
    waitFor(tag: 'ready' | 'busy' | 'canStop' | 'stopped' | 'executed'): Promise<void>;
    waitIf(tag: 'busy' | 'executing'): Promise<void>;
    getStatus(): 'stopped' | 'started' | 'critical'; //TODO: Move the types from the machine into this file to make more DRY
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

type createDatabaseFunc = (config: WorkhorseConfig) => Promise<RunQuery>;
type createTaskQueueFunc = (config: WorkhorseConfig, runQuery: RunQuery) => TaskQueue;
type createTaskRunnerFunc = (config: WorkhorseConfig, queue: TaskQueue, run: RunTask) => TaskRunner;
type createTaskExecutorFunc = (config: WorkhorseConfig, taskRunner: TaskRunner) => SingleTaskExecutor;

interface WorkhorseConfig {
    backoff: BackoffSettings;
    duplicates: DuplicateStrategy;
    concurrency: number,
    poll: {
        auto: boolean,
        interval: number,
        pre: {
            wait: 'ready'
            timeout?: number,
        },
        post: {
            wait: 'none' | 'busy' | 'executing' | 'ready'
            timeout?: number,
        }
    },
    taks: {
        include: {
            rowId: boolean
        },
    },
    factories: {
        createDatabase: createDatabaseFunc | undefined;
        createTaskQueue: createTaskQueueFunc | undefined;
        createTaskRunner: createTaskRunnerFunc| undefined;
        createTaskExecutor: createTaskExecutorFunc | undefined;
    }
}

interface DefaultWorkhorseConfig extends WorkhorseConfig {
    factories: {
        createDatabase: createDatabaseFunc;
        createTaskQueue: createTaskQueueFunc;
        createTaskRunner: createTaskRunnerFunc;
        createTaskExecutor: createTaskExecutorFunc;    
    }
}

interface QueueStatus {
    queued: number;
    executing: number;
    successful: number;
    failed: number;
}

function assertTaskRow(maybeTaskRow: object | Record<string, string | number> | undefined): asserts maybeTaskRow is TaskRow {
    if (maybeTaskRow==undefined) {
        throw new Error('Invalid TaskRow (missing)');
    }
    if ("id" in maybeTaskRow && typeof maybeTaskRow.id!=="number") {
        throw new Error(`Invalid row - id: ${maybeTaskRow.id}`);
    }
    if ("taskId" in maybeTaskRow && typeof maybeTaskRow.taskId!=="string") {
        throw new Error(`Invalid row - taskId: ${maybeTaskRow.taskId}`);
    }
    if ("payload" in maybeTaskRow && typeof maybeTaskRow.payload!=="object") {
        throw new Error(`Invalid row - payload: ${maybeTaskRow.payload}`);
    }
}

function assertNonPrimitive(payload: Payload): asserts payload is JSONObject {
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
        throw new TypeError('Payload must be a non-primitive JSON object.');
    }
}


export type { SqlExecutor, QueryResult, RunQuery, RowId, TaskRow, WorkhorseStatus, TaskQueue, QueueStatus, Payload, RunTask, TaskRunner, TaskExecutorPool, SingleTaskExecutor, WorkhorseConfig, DefaultWorkhorseConfig, BackoffSettings };
export { TaskState, DuplicateStrategy, assertTaskRow, assertNonPrimitive };

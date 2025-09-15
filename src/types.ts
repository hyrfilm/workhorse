import { InspectionEvent, Observer } from 'xstate';
import { SubscriptionEvents, WorkhorseEventMap } from '@/events/eventTypes.ts';

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

type SqlExecutor = (
  queryTemplate: TemplateStringsArray | string,
  ...params: unknown[]
) => Promise<QueryResult[]>;
type QueryResult = Record<string, string | number | null>[];
type RunQuery = (query: string, ...values: unknown[]) => Promise<QueryResult[]>;
type SubscriptionHandler<K extends SubscriptionEvents> = (payload: WorkhorseEventMap[K]) => void;

interface Workhorse {
  subscribe<K extends SubscriptionEvents>(event: K, handler: SubscriptionHandler<K>): () => void;
  queue: (taskId: string, payload: Payload) => Promise<void>;
  run: (taskId: string, payload: Payload) => Promise<unknown>;
  getStatus: () => Promise<QueueStatus>;
  startPoller: () => void;
  stopPoller: () => void;
  poll: () => Promise<void>;
  requeue: () => Promise<void>;
  shutdown: () => Promise<QueueStatus>;
}

interface CommandDispatcher {
  getStatus: () => Promise<QueueStatus>;
  queue: (taskId: string, payload: Payload) => Promise<QueueStatus>;
  requeue: () => Promise<QueueStatus>;
  startExecutors: () => Promise<QueueStatus>;
  stopExecutors: () => Promise<QueueStatus>;
  poll: () => Promise<QueueStatus>;
  log: (s: string) => void;
  shutdown: () => Promise<QueueStatus>;
}

interface WorkhorsePlugin {
  name: string;
  onStart(dispatcher: CommandDispatcher): void;
  onStop(): void;
}

export type Inspector =
  | Observer<InspectionEvent>
  | ((inspectionEvent: InspectionEvent) => void)
  | undefined;

interface WorkhorseConfig {
  backoff: BackoffSettings;
  duplicates: DuplicateStrategy;
  concurrency: number;
  taskExecution: TaskExecutorStrategy;
  logLevel: LogLevel;

  poll: {
    auto: boolean;
    interval: number;
    pre: {
      wait: 'ready';
      timeout?: number;
    };
  };
  plugins: WorkhorsePlugin[];
}

interface Factories {
  createDatabase: (config: WorkhorseConfig) => Promise<RunQuery>;
  createTaskQueue: (config: WorkhorseConfig, runQuery: RunQuery) => TaskQueue;
  createExecutorHooks: (config: WorkhorseConfig, queue: TaskQueue, run: RunTask) => TaskHooks;
  createTaskExecutor: (
    config: WorkhorseConfig,
    taskRunner: TaskHooks,
    inspect?: Inspector
  ) => SingleTaskExecutor;
  createExecutorPool: (
    config: WorkhorseConfig,
    executors: SingleTaskExecutor[],
    inspect?: Inspector
  ) => TaskExecutorPool;
}

enum TaskState {
  queued = 1,
  executing = 2,
  successful = 3,
  failed = 4,
}

type RowId = number;

interface TaskRow {
  id: RowId;
  taskId: string;
  payload: Payload;
}

type WorkhorseStatus = QueueStatus;

interface TaskQueue {
  addTask(taskId: string, payload: Payload): Promise<void>;
  reserveTask(): Promise<TaskRow | undefined>;
  taskSuccessful(taskRow: TaskRow): Promise<void>;
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

enum TaskExecutorStrategy {
  // loops over each executor, waits until its ready - and then performs a poll.
  SERIAL = 'serial',
  // like 'serial', but stores each wait-promise - and performs a Promise.all()
  PARALLEL = 'parallel',
  // does not wait, sends a poll message to executor and immediately returns
  DETACHED = 'detached',
}

enum RequeueStrategy {
  IMMEDIATE = 'immediate',
  DEFERRED = 'deferred',
}

interface PollOptions {
  pollInterval?: number;
  requeuing?: RequeueStrategy;
}

// Holds TaskExecutors, determined by config.concurrency
interface TaskExecutorPool {
  startAll(): Promise<void>;
  stopAll(): Promise<void>;
  pollAll(): Promise<void>;
  shutdown(): Promise<void>;
}

// Interface for the state machine that reserves taks in db, executes them and writes the result back
interface SingleTaskExecutor {
  start(): void;
  stop(): void;
  poll(): void;
  waitFor(tag: 'ready' | 'busy' | 'canStop' | 'stopped' | 'executed'): Promise<void>;
  waitIf(tag: 'busy' | 'executing'): Promise<void>;
  getStatus(): 'stopped' | 'started' | 'critical'; //TODO: Move the types from the machine into this file to make more DRY
}

interface TaskHooks {
  executeHook: () => Promise<void>;
  successHook: () => Promise<void>;
  reserveHook: () => Promise<void>;
  failureHook: () => Promise<void>;
}

type JSONPrimitive = string | number | boolean | null | undefined;
type JSONObject = { [key: string]: JSONValue };
type JSONArray = JSONValue[];
type JSONValue = JSONPrimitive | JSONObject | JSONArray;

type Payload = JSONValue;
type TaskResult = Payload | undefined;

// TODO: Use these for building up the type for Payload as well,
// TODO: we don't want to allow naked primitives or null values
type JsonValue = string | number | boolean | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue | null };
type JsonArray = JsonValue[];
type EventPayload = JsonObject;

type RunTask = (taskId: string, payload: Payload) => Promise<TaskResult>;

interface BackoffSettings {
  initial: number;
  multiplier: number;
  maxTime: number;
}

interface QueueStatus {
  queued: number;
  executing: number;
  successful: number;
  failed: number;
}

interface TaskQueueRow extends Record<string, number | string> {
  id: number;
  task_id: string;
  task_payload: string;
}

function assertTaskQueueRow(maybeTaskQueueRow: unknown): asserts maybeTaskQueueRow is TaskQueueRow {
  if (typeof maybeTaskQueueRow !== 'object' || maybeTaskQueueRow == null)
    throw new Error('Invalid TaskQueue row - is null');
  const row = maybeTaskQueueRow as Record<string, unknown>;
  if (typeof row.id !== 'number') throw new Error(`Invalid row TaskQueue row - missing "id"`);
  if (typeof row.task_id !== 'string')
    throw new Error(`Invalid row TaskQueue row - missing "task_id"`);
  if (typeof row.task_payload !== 'string')
    throw new Error(`Invalid row TaskQueue row - missing "payload"`);
}

function assertTaskRow(
  maybeTaskRow: object | Record<string, string | number> | undefined
): asserts maybeTaskRow is TaskRow {
  if (maybeTaskRow == undefined) {
    throw new Error('Invalid TaskRow (missing)');
  }
  if ('id' in maybeTaskRow && typeof maybeTaskRow.id !== 'number') {
    throw new Error(`Invalid row - id: ${maybeTaskRow.id}`);
  }
  if ('taskId' in maybeTaskRow && typeof maybeTaskRow.taskId !== 'string') {
    throw new Error(`Invalid row - taskId: ${maybeTaskRow.taskId}`);
  }
  if ('payload' in maybeTaskRow && typeof maybeTaskRow.payload !== 'object') {
    throw new Error(`Invalid row - payload: ${maybeTaskRow.payload}`);
  }
}

function assertNonPrimitive(payload: Payload): asserts payload is JSONObject {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new TypeError('Payload must be a non-primitive JSON object.');
  }
}

export type {
  SqlExecutor,
  QueryResult,
  RunQuery,
  RowId,
  TaskRow,
  Workhorse,
  WorkhorseStatus,
  TaskQueue,
  QueueStatus,
  Payload,
  RunTask,
  TaskResult,
  TaskHooks,
  TaskExecutorPool,
  SingleTaskExecutor,
  WorkhorseConfig,
  BackoffSettings,
  LogLevel,
  PollOptions,
  CommandDispatcher,
  WorkhorsePlugin,
  Factories,
  EventPayload,
};
export {
  TaskState,
  DuplicateStrategy,
  TaskExecutorStrategy,
  RequeueStrategy,
  assertTaskQueueRow,
  assertTaskRow,
  assertNonPrimitive,
};

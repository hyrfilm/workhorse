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
    taskRow: Record<string, unknown>;
}

interface TaskProducer {
    addTask(taskId: string, payload: string) : Promise<void>;
}

interface TaskConsumer {
    reserveTask() : Promise<TaskRow | undefined>;
    taskSuccessful(id: RowId) : Promise<void>;
    taskFailed(id: RowId): Promise<void>;
}

interface TaskQueue extends TaskProducer, TaskConsumer {
    countStatus(status: TaskState): Promise<number>;
}

interface TaskRunner {
    executeHook: () => Promise<void>;
    sucessHook: () => Promise<void>;
    reserveHook: () => Promise<void>;
    failureHook: () => Promise<void>
}

type JSONValue = string | number | boolean | null | JSONObject | JSONValue[];
interface JSONObject {
  [key: string]: JSONValue;
}
type Payload = JSONObject;

type RunTask = (taskId: string, payload: Payload) => Promise<void>;

interface BackoffSettings {
    initial: number;
    multiplier: number;
    maxTime: number;
}

interface WorkhorseConfig {
    backoff: BackoffSettings;
}

export type { SqlExecutor, RowId, TaskRow, TaskConsumer, TaskProducer, TaskQueue, Payload, RunTask, TaskRunner, WorkhorseConfig, BackoffSettings };
export { TaskState }; //TODO: Maybe remove this and just pass the parameters as normal args

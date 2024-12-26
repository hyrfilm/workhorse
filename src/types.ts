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

interface TaskRow {
    rowId: RowId;
    taskRow: Record<string, unknown>;
}

type Payload = object;

export type { SqlExecutor, RowId, TaskRow, TaskConsumer, TaskProducer, TaskQueue, Payload };
export { TaskState };

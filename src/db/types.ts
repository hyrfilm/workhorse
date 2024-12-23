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

type TaskId = number;

interface TaskProducer {
    addTask(identity: string, payload: string) : Promise<void>;
}

interface TaskConsumer {
    reserveTask() : Promise<TaskRow | undefined>;
    taskSuccessful(id: TaskId) : Promise<void>;
    taskFailed(id: TaskId): Promise<void>;
}


interface TaskQueue extends TaskProducer, TaskConsumer {
    countStatus(status: TaskState): Promise<number>;
}

interface TaskRow {
    taskId: TaskId;
    rowData: Record<string, unknown>;
}

export type { SqlExecutor, TaskId, TaskRow, TaskConsumer, TaskProducer, TaskQueue };
export { TaskState };

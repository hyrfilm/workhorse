import { createDatabase } from '@/db/createDatabase.ts';
import { createTaskQueue } from '@/queue/TaskQueue.ts';
import { createExecutorHooks } from '@/executor/hooks.ts';
import { createTaskExecutor } from '@/executor/TaskExecutor.ts';
import { createExecutorPool } from '@/executor/TaskExecutorPool.ts';
import { Factories } from '@/types.ts';

const defaultFactories = (): Factories => {
  return {
    createDatabase,
    createTaskQueue,
    createExecutorHooks,
    createTaskExecutor,
    createExecutorPool,
  };
};

export { defaultFactories };

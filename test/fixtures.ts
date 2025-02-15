// Returns a workhorse instance that's identical to a regular one except that it

import { RunTask, Workhorse, WorkhorseConfig } from '@/types';
import { createDatabaseStub } from './db/createDatabaseStub';
import { createTaskQueue } from '@/queue/TaskQueue';
import { createExecutorHooks } from '@/executor/hooks';
import { createTaskExecutor } from '@/executor/TaskExecutor';
import { createExecutorPool } from '@/executor/TaskExecutorPool';
import { createWorkhorse } from '@/workhorse';

// runs on node.js with an in-memory sqlite db.
async function createWorkhorseFixture(
  runTask: RunTask,
  options?: Partial<WorkhorseConfig>
): Promise<Workhorse> {
  const overrides = {
    createDatabase: createDatabaseStub,
    createTaskQueue: createTaskQueue,
    createHooks: createExecutorHooks,
    createTaskExecutor: createTaskExecutor,
    createExecutorPool: createExecutorPool,
  };
  return await createWorkhorse(runTask, options, overrides);
}

export { createWorkhorseFixture };

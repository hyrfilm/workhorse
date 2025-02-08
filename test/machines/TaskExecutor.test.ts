import {createExecutorHooks} from '@/executor/hooks.ts';
import {beforeEach, describe, expect, test} from 'vitest';
import {DuplicateStrategy, Payload, SingleTaskExecutor, TaskQueue, WorkhorseConfig} from '@/types';
import {createTaskQueue} from '@/queue/TaskQueue.ts';
import {createDatabaseStub} from 'test/db/createDatabaseStub';
import {createTaskExecutor} from '@/executor/TaskExecutor';
import { DuplicateTaskError } from '@/errors';
import {TaskHooks} from "@/types.ts";
import {defaultOptions} from "@/config.ts";

declare module 'vitest' {
    export interface TestContext {
        taskQueue: TaskQueue;
        // tuple: [taskId, payload, success, num retries]
        executedTasks: [string, Payload, boolean][];
        taskExecutor: SingleTaskExecutor;
        taskHooks: TaskHooks,
        // The ids of tasks that we want to fail are placed in this set
        failIds: Set<string>;
        config: WorkhorseConfig,
    }
  }

describe('TaskExecutor', () => {
    beforeEach(async (context) => {
        const cfg = defaultOptions();

        // We could use XState's simulated clocks instead, but here we just set
        // the backoff to not wait at all so that we don't need to wait for failing tasks
        cfg.backoff.initial = 0;
        cfg.backoff.maxTime = 0;
        cfg.backoff.multiplier = 0;
        cfg.duplicates = DuplicateStrategy.IGNORE;
        context.config = cfg;
        context.executedTasks = [];
        // task ids placed here will fail
        context.failIds = new Set();

        const runTask = async (taskId: string, payload: Payload): Promise<void> => {
            const successful = true;
            const failed = false;
            if(context.failIds.has(taskId)) {
                context.executedTasks.push([taskId, payload, failed]);
                await Promise.reject(new Error(`task ${taskId} failed`));
            } else {
                context.executedTasks.push([taskId, payload, successful]);
                await Promise.resolve();
            }
        }

        const runQuery = await createDatabaseStub();
        context.taskQueue = createTaskQueue(cfg, runQuery);
        context.taskHooks = createExecutorHooks(cfg, context.taskQueue, runTask);
        context.taskExecutor = createTaskExecutor(cfg, context.taskHooks);
        context.taskExecutor.start();
    });

    test('run successful tasks', async ({ taskQueue, taskExecutor, executedTasks }) => {
        for(let i=0;i<100;i++) {
            await taskQueue.addTask(`${i}`, { taskNr: i} );
        }
        for(let i=0;i<100;i++) {
            await taskExecutor.waitFor('ready');
            taskExecutor.poll();
            await taskExecutor.waitFor('executed')
        }

        for(let i=0;i<100;i++) {
            const successful = true;
            expect(executedTasks[i]).toEqual([`${i}`, { taskNr: i}, successful]);
        }
    });


    test('run every other task failing', async ({ failIds, taskQueue, taskExecutor, executedTasks }) => {
        for(let i=0;i<10;i++) {
            const isEven = (i % 2) !== 0;
            if (isEven) {
                failIds.add(`${i}`);
            }
            await taskQueue.addTask(`${i}`, {});
        }
        for(let i=0;i<10;i++) {
            await taskExecutor.waitFor('ready');
            taskExecutor.poll();
        }

        await taskExecutor.waitFor('executed')

        for(let i=0;i<10;i++) {
            const isEven = (i % 2) === 0;
            const successful = isEven;
            expect(executedTasks[i]).toEqual([`${i}`, {}, successful]);
        }
    });

    test('requeue failed tasks', async ({ failIds, taskQueue, taskExecutor }) => {
        for(let i=0;i<10;i++) {
            const taskId = `${i}`;
            await taskQueue.addTask(taskId, {});
            if (i>=5) {
                failIds.add(taskId);
            }
        }

        let status = await taskQueue.getStatus();
        expect(status.queued).toBe(10);
        expect(status.executing).toBe(0);
        expect(status.successful).toBe(0);
        expect(status.failed).toBe(0);
        
        for(let i=0;i<10;i++) {
            await taskExecutor.waitFor('ready');
            taskExecutor.poll();
        }

        await taskExecutor.waitFor('executed');

        status = await taskQueue.getStatus();
        expect(status).toEqual({queued: 0, executing: 0, successful: 5, failed: 5});

        // nothing should happen
        for(let i=0;i<100;i++) {
            await taskExecutor.waitFor('ready');
            taskExecutor.poll();            
        }

        status = await taskQueue.getStatus();

        expect(status.queued).toBe(0);
        expect(status.executing).toBe(0);
        expect(status.successful).toBe(5);
        expect(status.failed).toBe(5);

        await taskQueue.requeue();

        status = await taskQueue.getStatus();

        expect(status.executing).toBe(0);
        expect(status.successful).toBe(5);
        expect(status.failed).toBe(0);
        expect(status.queued).toBe(5);

        // make every task succeed
        failIds.clear();
        for(let i=0;i<5;i++) {
            await taskExecutor.waitFor('ready');
            taskExecutor.poll();
            await taskExecutor.waitFor('executed');
        }
        // now all should have succeeded
        status = await taskQueue.getStatus();

        expect(status).toEqual({queued: 0, executing: 0, successful: 10, failed: 0});
    });

    test('DuplicateStrategy - IGNORE', async ({ config, taskQueue }) => {
        config.duplicates = DuplicateStrategy.IGNORE;
        await taskQueue.addTask('task-1', {})
        await taskQueue.addTask('task-1', {})
        await taskQueue.addTask('task-1', {})

        const status = await taskQueue.getStatus();

        expect(status.queued).toBe(1);
    });

    test('DuplicateStrategy - FORBID', async ({ config, taskQueue }) => {
        config.duplicates = DuplicateStrategy.FORBID;
        await taskQueue.addTask('task-1', {});
        try {
            await taskQueue.addTask('task-1', {});
        } catch(e) {
            expect(e instanceof Error).toBe(true);
            expect(e instanceof DuplicateTaskError).toBe(true);
        }

        const status = await taskQueue.getStatus();

        expect(status.queued).toBe(1);
    });

    test('stopping & starting', async ({ taskExecutor, taskQueue }) => {
        for(let i=0;i<1000;i++) {
            await taskQueue.addTask(`${i}`, { taskNr: i} );
        }

        for(let i=0;i<250;i++) {
            await taskExecutor.waitFor('ready');
            taskExecutor.poll();
            await taskExecutor.waitIf('busy');
        }
        await taskExecutor.waitFor('canStop');
        taskExecutor.stop();
        await taskExecutor.waitFor('stopped');

        let status = await taskQueue.getStatus();
        expect(status).toEqual({ queued: 750, successful: 250, failed: 0, executing: 0 });

        //TODO: Should this throw an exeption? (right now it's just ignored)
        taskExecutor.poll();

        taskExecutor.start();

        for(let i=0;i<750;i++) {
            await taskExecutor.waitFor('ready');
            taskExecutor.poll();
            await taskExecutor.waitFor('executed');
        }

        status = await taskQueue.getStatus();
        expect(status).toEqual({ queued: 0, successful: 1000, failed: 0, executing: 0 });
    });

    test('polling empty queue', async ({ taskExecutor, taskQueue }) => {
        for(let i=0;i<250;i++) {
            await taskExecutor.waitFor('ready');
            taskExecutor.poll();
            await taskExecutor.waitFor('ready');
        }

        const status = await taskQueue.getStatus();
        expect(status).toEqual({ queued: 0, successful: 0, failed: 0, executing: 0 });
    });

    test('halting if failing to update task - successHook', async ({ config, taskQueue, taskHooks }) => {
        taskHooks.successHook = async (): Promise<void> => {
            throw new Error('Oups'); 
        }

        const taskExecutor = createTaskExecutor(config, taskHooks);
        taskExecutor.start();

        await taskExecutor.waitFor('ready');
        await taskQueue.addTask('task', {});
        taskExecutor.poll();
        await taskExecutor.waitFor('stopped');
        expect(taskExecutor.getStatus()).toBe('critical');
    });

    test('halting if failing to update task - failureHook', async ({ config, taskQueue, taskHooks }) => {
        taskHooks.failureHook = async (): Promise<void> => {
            throw new Error('Oups');
        }
        taskHooks.executeHook = async (): Promise<void> => {
            throw new Error('Oups');
        }

        const taskExecutor = createTaskExecutor(config, taskHooks);
        taskExecutor.start();

        await taskExecutor.waitFor('ready');
        await taskQueue.addTask('task', {});

        taskExecutor.poll();
        await taskExecutor.waitFor('stopped');
        expect(taskExecutor.getStatus()).toBe('critical');
    });
});
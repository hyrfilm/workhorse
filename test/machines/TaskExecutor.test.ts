import {createTaskRunner} from '@/TaskRunner';
import {beforeEach, describe, expect, test} from 'vitest';
import {assertNonPrimitive, Payload, TaskExecutor, TaskQueue } from '@/types';
import { config } from '@/config';
import { createTaskQueue } from '@/db/TaskQueue';
import { createDatabaseStub } from 'test/db/createDatabaseStub';
import { createTaskExecutor } from '@/machines/TaskExecutorMachine';

declare module 'vitest' {
    export interface TestContext {
        taskQueue: TaskQueue;
        executedTasks: [string, Payload][];
        taskExecutor: TaskExecutor;
    }
  }

describe('TaskExecutor', () => {
    beforeEach(async (context) => {
        config.factories.createDatabase = createDatabaseStub;
        config.factories.createTaskQueue = createTaskQueue;
        config.factories.createTaskRunner = createTaskRunner;
        config.factories.createTaskExecutor = createTaskExecutor;
        // We could use XState's simulated clocks instead but here we just set
        // the backoff to not wait at all so that we don't need to wait for failing tasks
        config.backoff.initial = 0;
        config.backoff.maxTime = 0;
        config.backoff.multiplier = 0;

        context.executedTasks = [];
        const runTask = async (taskId: string, payload: Payload): Promise<void> => {
            assertNonPrimitive(payload);
            context.executedTasks.push([taskId, payload]);
            if (payload.success) {
                return Promise.resolve();
            } else {
                await Promise.reject(new Error('Oups'));
            }
        }

        const runQuery = await config.factories.createDatabase(config);
        context.taskQueue = config.factories.createTaskQueue(config, runQuery);
        const taskRunner = config.factories.createTaskRunner(config, context.taskQueue, runTask);
        context.taskExecutor = config.factories.createTaskExecutor(config, taskRunner);
        context.taskExecutor.start();
    });

    test('run successful tasks', async ({ taskQueue, taskExecutor, executedTasks }) => {
        for(let i=0;i<100;i++) {
            await taskQueue.addTask(`${i}`, { success: true });                        
        }
        for(let i=0;i<100;i++) {
            await taskExecutor.waitFor('ready');
            taskExecutor.poll();
            await taskExecutor.waitFor('executed')
        }

        for(let i=0;i<100;i++) {
            expect(executedTasks[i]).toEqual([`${i}`, {'success': true}]);
        }
    });


    test('run every other task failing', async ({ taskQueue, taskExecutor, executedTasks }) => {
        for(let i=0;i<10;i++) {
            const isEven = (i % 2)
            await taskQueue.addTask(`${i}`, { success: isEven });
        }
        for(let i=0;i<10;i++) {
            await taskExecutor.waitFor('ready');
            taskExecutor.poll();
        }

        await taskExecutor.waitFor('executed')

        for(let i=0;i<10;i++) {
            const isEven = (i % 2)
            expect(executedTasks[i]).toEqual([`${i}`, {'success': isEven}]);
        }
    });

    test('requeue failed tasks', async ({ taskQueue, taskExecutor, executedTasks }) => {
        const successFunc = (i:number) => (i % 2);
        for(let i=0;i<10;i++) {
            await taskQueue.addTask(`${i}`, { success: successFunc(i) });
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
        expect(status.queued).toBe(0);
        expect(status.executing).toBe(0);
        expect(status.successful).toBe(5);
        expect(status.failed).toBe(5);

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

    });
});
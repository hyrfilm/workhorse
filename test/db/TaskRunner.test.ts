import {createTaskRunner} from '@/TaskRunner';
import {beforeEach, describe, expect, test} from 'vitest';
import {createDatabaseStub} from './createDatabaseStub';
import {Payload, RunTask, TaskQueue, TaskState} from '@/types';
import {ReservationFailed} from "@/errors.ts";
import { config } from '@/config';
import { createTaskQueue } from '@/db/TaskQueue';

declare module 'vitest' {
    export interface TestContext {
        taskQueue: TaskQueue;
    }
  }

describe('TaskRunner', () => {
    beforeEach(async (context) => {
        config.factories.createDatabase = createDatabaseStub;
        config.factories.createTaskQueue = createTaskQueue;

        const runQuery = await config.factories.createDatabase(config);
        context.taskQueue = config.factories.createTaskQueue(config, runQuery);
    
        await context.taskQueue.addTask('task1', {'dude': 'where'});
        await context.taskQueue.addTask('task2', {'is': 'my'});
        await context.taskQueue.addTask('task3', {'car': '?'});
    });

    test('reserve & run', async ({ taskQueue }) => {
        const actualTasks: any[] = [];
        const runStub: RunTask = async (taskId: string, payload: Payload) => {
            actualTasks.push({taskId, payload});
            await Promise.resolve();
        }

        const taskRunner = createTaskRunner(config, taskQueue, runStub);
        await taskRunner.reserveHook();
        await taskRunner.executeHook();

        await taskRunner.reserveHook();
        await taskRunner.executeHook();

        await taskRunner.reserveHook();
        await taskRunner.executeHook();

        expect(actualTasks).toEqual([
            {taskId: 'task1', payload: {dude: 'where'}},
            {taskId: 'task2', payload: {is: 'my'}},
            {taskId: 'task3', payload: {car: '?'}},
        ]);
    });

    test('reserve & run - success / failure', async ({ taskQueue }) => {
        const runStub: RunTask = async (_taskId: string, _payload: Payload) => {
        }

        let queued = await taskQueue.queryTaskCount(TaskState.queued);
        expect(queued).toBe(3);

        const taskRunner = createTaskRunner(config, taskQueue, runStub);
        await taskRunner.reserveHook();
        await taskRunner.executeHook();
        await taskRunner.successHook();

        await taskRunner.reserveHook();
        await taskRunner.executeHook();
        await taskRunner.successHook();

        await taskRunner.reserveHook();
        await taskRunner.executeHook();
        await taskRunner.failureHook();

        queued = await taskQueue.queryTaskCount(TaskState.queued);
        const successful = await taskQueue.queryTaskCount(TaskState.successful);
        const failed = await taskQueue.queryTaskCount(TaskState.failed);

        expect(queued).toBe(0);
        expect(successful).toBe(2);
        expect(failed).toBe(1);
    });

    test('no reservation', async ({taskQueue}) => {
        const taskRunner = createTaskRunner(config, taskQueue, (_p1, _p2) => Promise.resolve());
        await taskRunner.reserveHook();
        await taskRunner.reserveHook();
        await taskRunner.reserveHook();

        try {
            await taskRunner.reserveHook();
        } catch(err) {
            expect(err instanceof ReservationFailed)
        }
    });
});
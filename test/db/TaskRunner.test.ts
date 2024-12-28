import {createTaskRunner} from '@/TaskRunner';
import {beforeEach, describe, expect, test} from 'vitest';
import {createTaskQueueStub} from './TaskQueueStub';
import {Payload, RunTask, TaskState} from '@/types';
import {ReservationFailed} from "@/errors.ts";

let taskQueue = createTaskQueueStub();

describe('TaskRunner', () => {
    beforeEach(async () => {
        taskQueue = createTaskQueueStub();
        await taskQueue.addTask('task1', {'dude': 'where'});
        await taskQueue.addTask('task2', {'is': 'my'});
        await taskQueue.addTask('task3', {'car': '?'});
    });

    test('reserve & run', async () => {
        const actualTasks: any[] = [];
        const runStub: RunTask = async (taskId: string, payload: Payload) => {
            actualTasks.push({taskId, payload});
            await Promise.resolve();
        }

        const taskRunner = createTaskRunner(taskQueue, runStub);
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

    test('reserve & run - success / failure', async () => {
        const runStub: RunTask = async (_taskId: string, _payload: Payload) => {
        }

        let queued = await taskQueue.getSingleStatus(TaskState.queued);
        expect(queued).toBe(3);

        const taskRunner = createTaskRunner(taskQueue, runStub);
        await taskRunner.reserveHook();
        await taskRunner.executeHook();
        await taskRunner.successHook();

        await taskRunner.reserveHook();
        await taskRunner.executeHook();
        await taskRunner.successHook();

        await taskRunner.reserveHook();
        await taskRunner.executeHook();
        await taskRunner.failureHook();

        queued = await taskQueue.getSingleStatus(TaskState.queued);
        const successful = await taskQueue.getSingleStatus(TaskState.successful);
        const failed = await taskQueue.getSingleStatus(TaskState.failed);

        expect(queued).toBe(0);
        expect(successful).toBe(2);
        expect(failed).toBe(1);
    });

    test('no reservation', async () => {
        const taskRunner = createTaskRunner(taskQueue, (_p1, _p2) => Promise.resolve());
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
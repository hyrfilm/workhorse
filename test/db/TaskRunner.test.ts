import { createTaskRunner } from '@/TaskRunner';
import { test, beforeEach, afterEach, expect } from 'vitest';
import { createTaskQueueStub } from './TaskQueueStub';
import { RunTask, Payload } from '@/types';

test('TaskRunner', async () => {
    const taskQueue = createTaskQueueStub();

    await taskQueue.addTask('task1', {'dude': 'where'});
    await taskQueue.addTask('task2', {'is': 'my'});
    await taskQueue.addTask('task3', {'car': '?'});
    
    const runStub: RunTask = async (taskId: string, taskPayload: Payload) => {
        await Promise.resolve();
        console.log(taskId, taskPayload);
    }

    const taskRunner = createTaskRunner(taskQueue, runStub);
    await taskRunner.reserveHook();
    await taskRunner.executeHook();

    await taskRunner.reserveHook();
    await taskRunner.executeHook();

    await taskRunner.reserveHook();
    await taskRunner.executeHook();
});
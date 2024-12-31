import fc from "fast-check";
import { Payload } from "@/types";
import { createWorkhorse } from "@/workhorse";
import { config, getDefaultConfig } from "@/config";
import { test, expect, vi } from 'vitest';
import { createDatabaseStub } from "./db/createDatabaseStub";
import { createTaskQueue } from "@/db/TaskQueue";
import { createTaskRunner } from "@/TaskRunner";
import { createTaskExecutor } from "@/machines/TaskExecutorMachine";

vi.mock("@/db/createDatabase.ts", () => ({
  createDatabase: vi.fn(async () => {
    return await createDatabaseStub();
  }),
}));

test('Tasks are processed in the same order they were added', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.scheduler(),
      fc.uniqueArray(fc.nat(), { minLength: 1, maxLength: 36 }), // Array of unique task ids
      fc.integer({ min: 1, max: 100 }), // Concurrency level
      async (_scheduler, taskIds, concurrency) => {
        const executedTasks: string[] = [];
        
        // Define the runTask function
        const runTask = async (taskId: string, _payload: Payload): Promise<void> => {
          executedTasks.push(taskId);
          await Promise.resolve();
        };

        const cfg = structuredClone(getDefaultConfig());
        cfg.factories.createDatabase = createDatabaseStub;
        cfg.factories.createTaskQueue = createTaskQueue;
        cfg.factories.createTaskRunner = createTaskRunner;
        cfg.factories.createTaskExecutor = createTaskExecutor;    

        // Create the workhorse instance
        const workhorse = await createWorkhorse(runTask);

        // Set concurrency level in the config
        config.concurrency = concurrency;


          // Add tasks to the queue
        for (const id of taskIds) {
            workhorse.addTask(`${id}`, {});

        }


        for(let i=0;i<taskIds.length;i++) {
            await workhorse.poll();
        }

        //TODO: Diagnose why this never finishes
/*
        const pollPromises: Promise<void>[] = []
        // Process tasks by polling using the scheduler
        for(let i=0;i<1000;i++) {
            // Schedule the poll operation
            const promise = _scheduler.schedule(workhorse.poll());
            pollPromises.push(promise);
          }
          _scheduler.waitFor(Promise.all(pollPromises));
  */
          await workhorse.stop(); // Gracefully stop after processing
  
          // Assert that executed tasks match the original task IDs
          expect(executedTasks).toEqual(taskIds.map(id => `${id}`)); // Match string representation
  
      }
    )
  );
}, { timeout: 30_000});

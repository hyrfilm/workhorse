import log from "loglevel";
import {createWorkhorse} from "../src/workhorse.ts";
import * as tasks from "./tasks.ts";
import {TaskExecutorStrategy} from "../src/types";

export async function fetchExample(): Promise<void> {
 
    log.setDefaultLevel(log.levels.DEBUG);
    
    log.info("Creating workhorse instance...");

    const numTasks = 100;

    const workhorse = await createWorkhorse(tasks.jsonRequestTask, { concurrency: 50, taskExecution: TaskExecutorStrategy.DETACHED });

    log.info(`Creating ${numTasks} tasks...`);

    workhorse.startPoller();

    for (let i=0;i<numTasks;i++) {
        const url = `https://jsonplaceholder.typicode.com/posts`;
        const body = { title: `title ${i}`, body: `body ${i}`, userId: i};
        const method = 'POST';

        const taskId = `task-${i}`
        await workhorse.queue(taskId, { url, method, body });
        log.info(`Task added: ${taskId}`);
    }
}

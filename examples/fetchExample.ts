import log from "loglevel";
import {createWorkhorse} from "../src/workhorse.ts";
import * as tasks from "./tasks.ts";
import {config} from "../src/config";
import {seconds} from "../src/util/time";
import {TaskExecutorStrategy} from "../src/types";

export async function fetchExample() {
 
    log.setDefaultLevel(log.levels.DEBUG);
    
    config.concurrency = 50;
    //config.poll.auto = true;
    config.taskExecution = TaskExecutorStrategy.DETACHED;

    config.backoff.maxTime = seconds(60);

    log.info("Creating workhorse instance...");

    const numTasks = 1000;

    const workhorse = await createWorkhorse(tasks.jsonRequestTask);

    log.info(`Creating ${numTasks} tasks...`);

    await workhorse.startPoller();

    for (let i=0;i<numTasks;i++) {
        const url = `https://jsonplaceholder.typicode.com/posts`;
        const body = { title: `title ${i}`, body: `body ${i}`, userId: i};
        const method = 'POST';

        const taskId = `task-${i}`
        await workhorse.queue(taskId, { url, method, body });
        log.info(`Task added: ${taskId}`);
    }

    log.info("Processing tasks..."); 
}

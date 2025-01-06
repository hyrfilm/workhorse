import log from "loglevel";
import {createWorkhorse} from "../src/workhorse.ts";
import * as tasks from "../src/tasks.ts";
import { config } from "../src/config";
import { seconds } from "../src/util/time";

export async function fetchExample() {
 
    log.setDefaultLevel(log.levels.INFO);
    
    config.concurrency = 50;
    config.poll.auto = true;

    config.backoff.maxTime = seconds(5);

    log.info("Creating workhorse instance...");

    const numTasks = 1000;

    const workhorse = await createWorkhorse(tasks.jsonRequestTask);

    log.info(`Creating ${numTasks} tasks...`);

    for (let i=0;i<numTasks;i++) {
        const url = `https://jsonplaceholder.typicode.com/posts`;
        const body = { title: `title ${i}`, body: `body ${i}`, userId: i};
        const method = 'POST';

        const taskId = `task-${i}`
        await workhorse.queue(taskId, { url, method, body });
        log.info(`Task added: ${taskId}`);
    }

    log.info("Processing tasks...");

    poller();

    async function poller() {
        await workhorse.poll();
        const status = await workhorse.getStatus();
        const el = document.getElementById("status") as Element;
        el.innerHTML = JSON.stringify(status);
        if (status.queued>0 || status.executing>0) {
            setTimeout(poller, seconds(0.25));
        } else {
            log.info("Stopping workhorse...");
            await workhorse.stop();
            log.info("Shutting down...");
            await workhorse.shutdown();
            log.info("Done.");
        }
    }
}

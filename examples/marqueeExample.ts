import { createWorkhorse } from '../src/workhorse';
import log from "loglevel"
import {appendHTMLTask} from "./tasks";
import {seconds} from "../src/util/time.ts";
import {config} from "../src/config.ts";
import {createTaskQueue} from "../src/queue/TaskQueue.ts";
import {createDatabase} from "../src/queue/db/createDatabase.ts";
import {createTaskHooks} from "../src/executor/TaskHooks.ts";
import {createTaskExecutor} from "../src/executor/TaskExecutor.ts";

export async function marqueeExample() {
    log.setDefaultLevel(log.levels.INFO);

    const numTasks = 1000;

    const workhorse = await createWorkhorse(appendHTMLTask);

    log.info("Adding tasks...");

    config.factories.createDatabase = createDatabase;
    config.factories.createTaskQueue = createTaskQueue;
    config.factories.createHooks = createTaskHooks;
    config.factories.createTaskExecutor = createTaskExecutor;

    for(let i=1;i<=numTasks;i++) {
        const status = await workhorse.getStatus();
        const el = document.getElementById("status") as Element;
        el.innerHTML = JSON.stringify(status);

        await workhorse.queue(`task-1-${i}`, { parentId: 'tasks', tag: 'marquee', 'text': `Hi! from task #${i}`, delay: Math.random() * numTasks/i * seconds(0.0007)});
    }

    let done = false;

    while(!done) {
        await workhorse.poll();
        const status = await workhorse.getStatus();
        const el = document.getElementById("status") as Element;
        el.innerHTML = JSON.stringify(status);
        log.info(status);
        if (status.successful===numTasks) {
            done = true;
        }
    }
}
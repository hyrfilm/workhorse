import { createWorkhorse } from './workhorse';
import log from "loglevel"
import {appendHTMLTask} from "./tasks";
import {seconds} from "@/util/time.ts";
import {config} from "@/config.ts";
import {createTaskQueue} from "@/db/TaskQueue.ts";
import {createDatabase} from "@/db/createDatabase.ts";
import {createTaskRunner} from "@/TaskRunner.ts";
import {createTaskExecutor} from "@/machines/TaskExecutorMachine.ts";

export async function marqueeExample() {
    log.setDefaultLevel(log.levels.INFO);

    const numTasks = 10000;

    const workhorse = await createWorkhorse(appendHTMLTask);

    log.info("Adding tasks...");

    config.factories.createDatabase = createDatabase;
    config.factories.createTaskQueue = createTaskQueue;
    config.factories.createTaskRunner = createTaskRunner;
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
        if (!status.queued) {
            done = true;
        }
    }
}
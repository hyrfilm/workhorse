import { createWorkhorse } from './workhorse';
import log from "loglevel"
import {appendHTMLTask} from "./tasks";
import {seconds} from "@/util/time.ts";

log.setDefaultLevel(log.levels.INFO);

const numTasks = 10000;

const workhorse = await createWorkhorse(appendHTMLTask);

log.info("Adding tasks...");

for(let i=1;i<=numTasks;i++) {
    const status = await workhorse.getStatus();
    const el = document.getElementById("status") as Element;
    el.innerHTML = JSON.stringify(status);

    workhorse.addTask(`task-1-${i}`, { parentId: 'tasks', tag: 'marquee', 'text': `Hi! from task #${i}`, delay: Math.random() * numTasks/i * seconds(0.0007)});
    if (numTasks>100) {
        workhorse.poll();
    }
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
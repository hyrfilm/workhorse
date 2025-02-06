import {createWorkhorse} from '../src/workhorse';
import log from "loglevel"
import {appendHTMLTask} from "./tasks";
import {seconds} from "../src/util/time.ts";
import {TaskExecutorStrategy, Workhorse} from "../src/types";

declare global {
    interface Window {
        workhorse: Workhorse;
    }
}

export async function marqueeExample() {
    log.setDefaultLevel(log.levels.INFO);

    const numTasks = 1000;

    const options = { taskExecution: TaskExecutorStrategy.PARALLEL, concurrency: 10 };
    const workhorse = await createWorkhorse(appendHTMLTask, options);
    window.workhorse = workhorse;
    log.info("Adding tasks...");

    const el = document.getElementById("status") as Element;

    for(let i=1;i<=numTasks;i++) {
        const status = await workhorse.getStatus();
        el.innerHTML = JSON.stringify(status);

        await workhorse.queue(`task-1-${i}`, { parentId: 'tasks', tag: 'marquee', 'text': `Hi! from task #${i}`, delay: Math.random() * numTasks/i * seconds(0.0007)});
    }

    workhorse.startPoller();

    function updateStatus() {
        workhorse.getStatus().then((status) => {
            el.innerHTML = JSON.stringify(status);
        });

        setTimeout(updateStatus, 100);
    }

    updateStatus();
}
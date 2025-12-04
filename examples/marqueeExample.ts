//import {createWorkhorse} from '@/workhorse.ts';
//import {PauseWhenOffline} from '../src/plugins/PauseWhenOffline.ts'
//import {plugins} from '@/workhorse.ts'
import log from "loglevel"
import {appendHTMLTask} from "./tasks";
import {seconds} from '@/util/time.ts';
import {TaskExecutorStrategy} from '@types';

import { createWorkhorse } from 'src';

export async function run(): Promise<void> {
    log.setDefaultLevel(log.levels.DEBUG);

    const numTasks = 1000;

    const options = { taskExecution: TaskExecutorStrategy.SERIAL, concurrency: 1 };
    const workhorse = await createWorkhorse(appendHTMLTask, options);
    log.info("Adding tasks...");

    const el = document.getElementById("status") as Element;

    for(let i=1;i<=numTasks;i++) {
        const status = await workhorse.getStatus();
        el.innerHTML = JSON.stringify(status);

        await workhorse.queue(`task-1-${i}`, { parentId: "tasks-lg", tag: 'marquee', 'text': `Hi! from task #${i}`, delay: Math.random() * numTasks/i * seconds(0.0007)});
    }

    workhorse.startPoller();

    await updateStatus();

    async function updateStatus(): Promise<void> {
        const status = await workhorse.getStatus();
        el.innerHTML = JSON.stringify(status);
        setTimeout(() => updateStatus, 100);
    }
}
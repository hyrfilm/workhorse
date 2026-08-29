import log from "loglevel"
import {appendHTMLTask} from "./tasks";
import {seconds} from '@/util/time.ts';
import {TaskExecutorStrategy, WorkhorseConfig} from '@types';

import { createWorkhorse } from 'src';
import { QueueVisualizer } from '@/plugins';

export async function run(): Promise<void> {
    log.setDefaultLevel(log.levels.DEBUG);

    const numTasks = 300;

    const options: Partial<WorkhorseConfig> = { logLevel: 'debug', taskExecution: TaskExecutorStrategy.SERIAL, concurrency: 1, plugins: [new QueueVisualizer()] };
    const workhorse = await createWorkhorse(appendHTMLTask, options);
    log.info("Adding tasks...");

    const el = document.getElementById("status") as Element;

  workhorse.startPoller();

  for(let i=1;i<=numTasks;i++) {
        const status = await workhorse.getStatus();
        el.innerHTML = JSON.stringify(status);

        workhorse.queue(`task-1-${i}`, { parentId: "tasks-lg", tag: 'marquee', 'text': `Hi! from task #${i}`, delay: Math.random() * numTasks/i * seconds(0.0007)});
    }

    await updateStatus();

    async function updateStatus(): Promise<void> {
        const status = await workhorse.getStatus();
        el.innerHTML = JSON.stringify(status);
        setTimeout(() => updateStatus, 100);
    }
}
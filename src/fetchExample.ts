import log from "loglevel";
import {createWorkhorse} from "@/workhorse.ts";
import * as tasks from "@/tasks.ts";

log.info("Creating workhorse instance...");

const workhorse = await createWorkhorse(tasks.jsonRequestTask);

log.info("Creating tasks...");


for (let i=0;i<1000;i++) {
    const url = `https://jsonplaceholder.typicode.com/posts`;
    const body = { title: `title ${i}`, body: `body ${i}`, userId: i};
    const method = 'POST';

    await workhorse.addTask(`task-${i}`, { url, method, body });
}

log.info("Processing tasks...");

let done = false;

while(!done) {
    await workhorse.poll();
    const status = await workhorse.getStatus();
    if (!status.queued) {
        done = true;
    }
}
import { createWorkhorse } from './workhorse';
import * as tasks from './tasks';
import log from "loglevel"
import { seconds } from './util/time';

log.setDefaultLevel(log.levels.INFO);

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

const concurrency = 50;
const pollers = [];

let done = false;
while(!done) {
    for(let i=0;i<concurrency;i++) {
        pollers.push(workhorse.poll());
    }    
    await Promise.race(pollers);
    const { queued } = await workhorse.getStatus();
    done = !queued;
}

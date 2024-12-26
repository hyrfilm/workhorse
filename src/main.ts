import { createWorkhorse } from './workhorse';
import * as tasks from './tasks';
import log from "loglevel"

log.setDefaultLevel(log.levels.INFO);

log.info("Creating workhorse instance...");

const workhorse = await createWorkhorse(tasks.printTask);

log.info("Creating tasks...");

/*
for (let i=0;i<1000;i++) {
    const url = `https://jsonplaceholder.typicode.com/posts`;
    const body = { title: `title ${i}`, body: `body ${i}`, userId: i};
    const method = 'POST';

    await workhorse.addTask(`task-${i}`, { url, method, body });
}
*/
for (let i=0;i<1000;i++) {
    await workhorse.addTask(`task-${i}`, { msg: 'dude!' });
}


log.info("Processing tasks...");

const concurrency = 5;
const pollers = [];

let done = false;
while(!done) {
    await workhorse.poll();

/*    
    for(let i=0;i<concurrency;i++) {
        pollers.push(workhorse.poll());
    }    
    await Promise.allSettled(pollers);
*/    
    //const { queued } = await workhorse.getStatus();
    //done = !queued;
}

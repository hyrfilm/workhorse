import { createWorkhorse } from '../src/workhorse';
import { printTask } from './tasks';
import log from "loglevel"
import { seconds } from '../src/util/time';

log.setDefaultLevel(log.levels.INFO);

log.info("Creating workhorse instance...");

const workhorse = await createWorkhorse(printTask);

log.info("Adding some tasks...");

await workhorse.queue('task1', { msg: 'dude' });
await workhorse.queue('task2', { msg: 'where', delay: seconds(4) });
await workhorse.queue('task3', { msg: 'is', delay: seconds(3) });
await workhorse.queue('task4', { msg: 'my', delay: seconds(2) });
await workhorse.queue('task5', { msg: 'car', delay: seconds(1) });

log.info('Done');

let done = false;
while(!done) {
    await workhorse.poll();
    const status = await workhorse.getStatus();
    if (status.queued===0) {
        if (status.failed) {
            await workhorse.requeue();
        } else {
            if (status.executing===0) {
                done = true;
            }
        }
    }    
}
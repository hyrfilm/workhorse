import { createWorkhorse } from './workhorse';
import { printTask } from '@/tasks';
import log from "loglevel"
import { seconds } from './util/time';

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

log.info(await workhorse.getStatus());

await workhorse.poll();

log.info(await workhorse.getStatus());

await workhorse.poll();

log.info(await workhorse.getStatus());

await workhorse.poll();

log.info(await workhorse.getStatus());

await workhorse.poll();

log.info(await workhorse.getStatus());

await workhorse.poll();

log.info(await workhorse.getStatus());


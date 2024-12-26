import { createWorkhorse } from './workhorse';
import { printTask } from '@/tasks';
import log from "loglevel"
import { seconds } from './util/time';

log.setDefaultLevel(log.levels.INFO);

log.info("Creating workhorse instance...");

const workhorse = await createWorkhorse(printTask);

log.info("Adding some tasks...");

await workhorse.addTask('task1', { msg: 'dude' });
await workhorse.addTask('task2', { msg: 'where', delay: seconds(4) });
await workhorse.addTask('task3', { msg: 'is', delay: seconds(3) });
await workhorse.addTask('task4', { msg: 'my', delay: seconds(2) });
await workhorse.addTask('task5', { msg: 'car', delay: seconds(1) });

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


import { createWorkhorse } from './workhorse';

console.log("Creating workhorse instance...")

const workhorse = await createWorkhorse();

console.log("Adding some tasks...");

await workhorse.addTask('task1', 'dude');
await workhorse.addTask('task2', 'where');
await workhorse.addTask('task3', 'is');
await workhorse.addTask('task4', 'my');
await workhorse.addTask('task5', 'car');

console.log('Done');

console.log(await workhorse.getStatus());

await workhorse.poll();

console.log(await workhorse.getStatus());

await workhorse.poll();

console.log(await workhorse.getStatus());

await workhorse.poll();

console.log(await workhorse.getStatus());

await workhorse.poll();

console.log(await workhorse.getStatus());

await workhorse.poll();

console.log(await workhorse.getStatus());


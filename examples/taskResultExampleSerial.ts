import {createWorkhorse} from "../src/workhorse.ts";
import * as tasks from "./tasks.ts";
import {millisec} from "../src/util/time.ts";
import { log, setLogLevel } from "../src/util/logging.ts";
import { v4 as uuidv4 } from 'uuid';
import { TaskExecutorStrategy } from "../src/types.ts";

// This example creates some downloading tasks awaits each one
// until moving on to the next
export async function run(): Promise<void> {
    setLogLevel("info");

    log("Creating workhorse instance...");    

    const numTasks = 1000;

    const workhorse = await createWorkhorse(tasks.jsonRequestTask, { taskExecution: TaskExecutorStrategy.SERIAL, concurrency: 1, poll: { auto: false, pre: { wait: 'ready'}, interval: millisec(100)} } );

    const container = document.getElementById('tasks');

    log(`Running ${numTasks} tasks...`);

    for(let i=0;i<numTasks;i++) {
        const id = i + 1;
        const url = `https://jsonplaceholder.typicode.com/photos/${id}`;
        const method = 'GET';
        const taskId = uuidv4();
        const result = await workhorse.run(taskId, { url, method });
        const newTask = document.createElement('div');
        newTask.textContent = `Task ${i+1}`;
        const description = document.createElement('h4');
        description.textContent = 'Queues 1000 downloads and processes them sequentially.';
        container!.appendChild(description);
        container!.appendChild(newTask);
        newTask.textContent+= ' ' + JSON.stringify(result)
    }

    await workhorse.shutdown();
}

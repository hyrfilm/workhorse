import {createWorkhorse} from "../src/workhorse.ts";
import * as tasks from "./tasks.ts";
import {millisec, seconds, sleep} from "../src/util/time.ts";
import { log, setLogLevel } from "../src/util/logging.ts";
import { Emitter } from '../src/events/emitter.ts';
import { v4 as uuidv4 } from 'uuid';
import { TaskExecutorStrategy } from "../src/types.ts";

// This example some downloading tasks 
// and renders the result of them as they come in
export async function taskResultExample() {
    setLogLevel("info");

    log("Creating workhorse instance...");    

    const numTasks = 1000;

    const workhorse = await createWorkhorse(tasks.jsonRequestTask, { taskExecution: TaskExecutorStrategy.DETACHED, concurrency: 100, poll: { auto: true, pre: { wait: 'ready'}, interval: millisec(100)} } );

    const container = document.getElementById('tasks');
    
    const taskIds: Record<string, string> = {}

    for (let i = 0; i < numTasks; i++) {
      const newTask = document.createElement('div');
      const taskId = uuidv4();
      taskIds[taskId] = taskId;
      newTask.id = taskId;
      newTask.textContent = `Task ${i+1}`;
      container!.appendChild(newTask);
    }

    log(`Running ${numTasks} tasks...`);

    Object.keys(taskIds).forEach((taskId, index) => {
        const id = index + 1;
        const url = `https://jsonplaceholder.typicode.com/photos/${id}`;
        const method = 'GET';
        const result = workhorse.run(taskId, { url, method }).then((result) => document.getElementById(taskId)!.textContent+= ' ' + JSON.stringify(result)).catch((e) => console.error);
        document.getElementById(taskId)!.textContent+= ' ' + JSON.stringify(result)
    });


    let done = false;

    while(!done) {
        const status = await workhorse.getStatus();
        if (status.successful===numTasks) {
            done = true;
        }
        sleep(seconds(1));
    }

    await workhorse.shutdown();
}

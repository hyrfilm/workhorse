import { createWorkhorse } from "../src/workhorse.ts";
import * as tasks from "./tasks.ts";
import { millisec, seconds, sleep } from "../src/util/time.ts";
import { log, setLogLevel } from "../src/util/logging.ts";
import { v4 as uuidv4 } from 'uuid';
import { TaskExecutorStrategy } from "../src/types.ts";

export async function run(): Promise<void> {
    setLogLevel("info");

    log("Creating workhorse instance...");    

    const numTasks = 100;
    const concurrency = 5;
    const workhorse = await createWorkhorse(tasks.jsonRequestTask, { taskExecution: TaskExecutorStrategy.DETACHED, concurrency, poll: { auto: true, pre: { wait: 'ready'}, interval: millisec(100)} } );

    const container = document.getElementById('tasks');
    const description = document.createElement('h4');
    description.textContent = `Queues ${numTasks} requests and processes them in parallel using ${concurrency} workers.`;
    container!.appendChild(description);

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
        const result = workhorse.run(taskId, { url, method }).then((result) => document.getElementById(taskId)!.textContent+= ' ' + JSON.stringify(result)).catch(console.error);
        document.getElementById(taskId)!.textContent+= ' ' + JSON.stringify(result)
    });


    let done = false;
    const statusElement = document.getElementById("status") as Element;

    while(!done) {
        const status = await workhorse.getStatus();
        statusElement.innerHTML = JSON.stringify(status);
        if (status.successful===numTasks) {
            done = true;
        }
        sleep(seconds(1));
    }

    await workhorse.shutdown();
}

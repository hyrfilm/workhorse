import { createWorkhorse } from '@/workhorse.ts';
import { millisec, sleep } from '@/util/time.ts';
import { Payload, Workhorse } from '@types';

let fast: Workhorse;
let slow: Workhorse;
let fastCounter = 0;
let slowCounter = 0;

function appendLog(elId: string, msg: string) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = (el.textContent ?? '') + msg + ' - done!' + '\n';
  el.scrollTop = el.scrollHeight;
}

const slowTask = async (taskId: string, _payload: Payload): Promise<undefined> => {
  // Simulate a slow task
  await sleep(millisec(Math.random()*900));
  appendLog('log-slow', taskId);
  // Enqueue 10 fast tasks, capped by numTasks
  for (let i = 0; i < 10; i++) {
    const id = `fast-task-${fastCounter++}`;
    if (fastCounter <= maxFastTasks) await fast.queue(id, {});
  }
};

const fastTask = async (taskId: string, _payload: Payload): Promise<undefined> => {
  await sleep(millisec(Math.random()*100));
  appendLog('log-fast', taskId);
  // Enqueue 1 slow task, capped by numTasks
  const id = `slow-task-${slowCounter++}`;
  if (slowCounter <= maxSlowTasks) await slow.queue(id, {});
};

// Caps to avoid infinite growth
const maxFastTasks = 100_000;
const maxSlowTasks = 100_000;

export async function run(): Promise<void> {
  const slowConcurrency = 3;
  const fastConcurrency = 2;

  slow = await createWorkhorse(slowTask, { logLevel: 'info', dbPath: 'file:<workhorse1.db>?mode=memory&cache=shared', concurrency: slowConcurrency });
  fast = await createWorkhorse(fastTask, { logLevel: 'info', dbPath: 'file:<workhorse2.db>?mode=memory&cache=shared', concurrency: fastConcurrency });

  // Seed with one initial slow task
  await slow.queue(`slow-task-${slowCounter++}`, {});

  slow.startPoller();
  fast.startPoller();

  await loop4ever();

  async function loop4ever() {
    const slowStatus = await slow.getStatus();
    const fastStatus = await fast.getStatus();
    const slowEl = document.getElementById('status-slow');
    const fastEl = document.getElementById('status-fast');
    if (slowEl) slowEl.textContent = JSON.stringify({ ...slowStatus, concurrency: slowConcurrency});
    if (fastEl) fastEl.textContent = JSON.stringify({ ...fastStatus, concurrency: fastConcurrency});
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setTimeout(loop4ever, 10);
  }
}
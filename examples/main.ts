import * as marqueeExample from "./marqueeExample";
import * as highConcurrencyExample from "./taskResultExampleHighConcurrency.ts";
import * as serialTaskResult from "./taskResultExampleSerial.ts";
import * as parallelTaskResult from "./taskResultExampleParallel.ts";
import * as multipleInstancesExample from "./multipleInstancesExample.ts";
import { initQueueVisualizer } from '@/plugins/visualization/MatrixViz.ts';

interface Example {
    run(): Promise<void>
}

// Always loaded; MatrixViz itself only renders visibly when ?viz=1 is set.
initQueueVisualizer();

const exampleConfig: Record<string, { hasViz?: boolean; hasStatus?: boolean; hasQueues?: boolean }> = {
  '0': { hasViz: true },
  '1': { hasStatus: true },
  '2': { hasStatus: true },
  '3': { hasStatus: true },
  '4': { hasQueues: true },
} as const;

const examples: Record<string, Example> = {
  0: marqueeExample,
  1: serialTaskResult,
  2: parallelTaskResult,
  3: highConcurrencyExample,
  4: multipleInstancesExample,
};

const params = new URLSearchParams(window.location.search);
const currentExample = params.get('example') || '0';

const exampleSelector = document.getElementById('example-selector')!;
const links = exampleSelector.querySelectorAll('[data-example]');

// Highlight current example
links.forEach(link => {
    if (link.getAttribute('data-example') === currentExample) {
        (link as HTMLElement).style.textDecoration = 'none';
        (link as HTMLElement).style.fontWeight = 'bold';
    }
});

function updateSearchbar(example: string) {
  params.set('example', example);
  if (exampleConfig[example]?.hasViz) {
    params.set('viz', '1');
  } else {
    params.delete('viz');
  }
  window.location.search = params.toString();
}

function updateUIVisibility(example: string) {
  const config = exampleConfig[example];
  const statusEl = document.getElementById('status')!;
  const queuesEl = document.getElementById('queues')!;

  statusEl.style.display = config?.hasStatus ? 'block' : 'none';
  queuesEl.style.display = config?.hasQueues ? 'flex' : 'none';
}

// Click handler
exampleSelector.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.dataset.example) {
      updateSearchbar(target.dataset.example);
    }
});

const searchParams = new URLSearchParams(window.location.search);
const exampleIndex = searchParams.get('example');

if (exampleIndex == null) {
  // No example selected yet: redirect to the default and stop.
  // A real navigation is about to happen, so don't start an example
  // that would be abandoned mid-load.
  updateSearchbar('0');
} else {
  updateUIVisibility(exampleIndex);
  await examples[exampleIndex].run();
}

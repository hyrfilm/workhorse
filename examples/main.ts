import * as marqueeExample from "./marqueeExample";
import * as highConcurrencyExample from "./taskResultExampleHighConcurrency.ts";
import * as serialTaskResult from "./taskResultExampleSerial.ts";
import * as parallelTaskResult from "./taskResultExampleParallel.ts";
import * as multipleInstancesExample from "./multipleInstancesExample.ts";

interface Example {
    run(): Promise<void>
}

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

// Click handler
exampleSelector.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.dataset.example) {
        params.set('example', target.dataset.example);
        window.location.search = params.toString();
    }
});

const examples: Record<string, Example> = {
    0: marqueeExample,
    1: serialTaskResult,
    2: parallelTaskResult,
    3: highConcurrencyExample,
    4: multipleInstancesExample,
};

const searchParams = new URLSearchParams(window.location.search);
const exampleIndex = searchParams.get('example') ?? '0';
let example = marqueeExample;
if (exampleIndex in examples) {
    example = examples[exampleIndex];
}
await example.run();

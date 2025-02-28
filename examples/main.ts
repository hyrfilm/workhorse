import * as marqueeExample from "./marqueeExample";
import * as parallelTaskResult from "./taskResultExampleParallel";
import * as serialTaskResult from "./taskResultExampleSerial";
interface Example {
    run(): Promise<void>
}

const examples: Record<string, Example> = {
    0: marqueeExample,
    1: serialTaskResult,
    2: parallelTaskResult,
};

const searchParams = new URLSearchParams(window.location.search);
const exampleIndex = searchParams.get('example') ?? '0';
let example = marqueeExample;
if (exampleIndex in examples) {
    example = examples[exampleIndex];
}
await example.run();

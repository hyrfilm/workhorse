import * as parallelTaskResult from "./taskResultExampleParallel";
import * as serialTaskResult from "./taskResultExampleSerial";

const examples = {
    1: serialTaskResult,
    2: parallelTaskResult,
};

const searchParams = new URLSearchParams(window.location.search);
const exampleQuery = searchParams.get('example') ?? '1';
let example = examples[exampleQuery];
if (!example) {
    example = parallelTaskResult
}
await example.run();

type Milliseconds = number;

const millisec = (ms: number): Milliseconds => ms;
const seconds = (sec: number): Milliseconds => millisec(1000) * sec;
const minutes = (min: number): Milliseconds => seconds(60) * min;
const hours = (hr: number): Milliseconds => minutes(60) * hr;
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export { millisec, millisec as ms, seconds, minutes, hours, sleep };
type Milliseconds = number;

const millisec = (ms: number): Milliseconds => ms;
const seconds = (sec: number): Milliseconds => millisec(1000) * sec;
const minutes = (min: number): Milliseconds => seconds(60) * min;
const hours = (hr: number): Milliseconds => minutes(60) * hr;

export { millisec, millisec as ms, seconds, minutes, hours };
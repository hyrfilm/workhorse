import { Payload } from '@/types';
import { EventEmitter } from 'eventemitter3';

const eventEmitter = new EventEmitter();
const Emitter = {
  on: (event: string, fn: (payload: Payload | undefined) => void): void => {
    eventEmitter.on(event, fn);
  },
  once: (event: string, fn: (payload: Payload | undefined) => void): void => {
    eventEmitter.once(event, fn);
  },
  off: (event: string, fn: (payload: Payload | undefined) => void): void => {
    eventEmitter.off(event, fn);
  },
  emit: (event: string, payload: Payload | undefined): void => {
    eventEmitter.emit(event, payload);
  },
};

export { Emitter };

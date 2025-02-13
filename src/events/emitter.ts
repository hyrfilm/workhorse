import { EventEmitter } from 'eventemitter3';
import { EventPayload } from '@types';
import { Event } from '@/events/eventTypes.ts';

const eventEmitter = new EventEmitter();

interface Emitter {
  on(event: Event, fn: (payload: EventPayload) => void): void;
  once(event: Event, fn: (payload: EventPayload) => void): void;
  off(event: Event, fn: (payload: EventPayload) => void): void;
  emit(event: Event, payload?: EventPayload): void;
}

const EMPTY_PAYLOAD = Object.freeze({} as const);

const Emitter: Emitter = {
  on: (event, fn) => {
    eventEmitter.on(event, fn);
  },
  once: (event, fn) => {
    eventEmitter.once(event, fn);
  },
  off: (event, fn) => {
    eventEmitter.off(event, fn);
  },
  emit: (event, payload = EMPTY_PAYLOAD) => {
    eventEmitter.emit(event, payload);
  },
} as const;

export { Emitter, EMPTY_PAYLOAD };

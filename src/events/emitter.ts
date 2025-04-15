import { EventEmitter } from 'eventemitter3';
import type { WorkhorseEventMap } from './eventTypes';

interface TypedEmitter<Events extends Record<string, any>> {
  on<K extends keyof Events>(event: K, fn: (payload: Events[K]) => void): void;
  once<K extends keyof Events>(event: K, fn: (payload: Events[K]) => void): void;
  off<K extends keyof Events>(event: K, fn: (payload: Events[K]) => void): void;
  emit<K extends keyof Events>(event: K, payload: Events[K]): void;
}

function createTypedEmitter<Events extends Record<string, any>>(): TypedEmitter<Events> {
  const ee = new EventEmitter();

  return {
    on(event, fn) {
      ee.on(event as string, fn as (...args: any[]) => void);
    },
    once(event, fn) {
      ee.once(event as string, fn as (...args: any[]) => void);
    },
    off(event, fn) {
      ee.off(event as string, fn as (...args: any[]) => void);
    },
    emit(event, payload) {
      ee.emit(event as string, payload);
    },
  };
}

const Emitter: TypedEmitter<WorkhorseEventMap> = createTypedEmitter();

export { Emitter, createTypedEmitter };
export type { TypedEmitter };

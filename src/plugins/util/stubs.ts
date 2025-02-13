import { Emitter } from '@/events';
import { EmitLog } from '@/types';

const emitter: Emitter = {
  on: (_event, _fn) => {},
  once: (_event, _fn) => {},
  off: (_event, _fn) => {},
  emit: (_event, _payload) => {},
} as const;

const log: EmitLog = (_logLevel, ..._msg) => {};

export { emitter, log };

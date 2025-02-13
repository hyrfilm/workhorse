// for adding a "source: <name>" field to the payload
// takes a name and returns a function which accepts a payload and returns it with the source added
import { EmitLog, LogLevel } from '@types';
import { Actions } from '@/events/eventTypes.ts';
import { Emitter, EMPTY_PAYLOAD } from '@/events/emitter.ts';

// allows for adding a "source: <name>" to the payload
// It takes a name and returns a function that be called for payloads
// where that name should be added as a field
const withSource =
  (source: string) =>
  <T extends object>(data: T) => ({
    ...data,
    source,
  });

// returns a function which emits log events
// with a "source: <name>" in the payload
// typical usage:
// const emitLog = createLogEmitter("somePlugin");
// emitLog("info", "starting up");
const createLogEmitter = (source: string): EmitLog => {
  const addSource = withSource(source);

  return (level: LogLevel, ...messages: string[]): void => {
    Emitter.emit(Actions.Log, addSource({ level, messages }));
  };
};

const createEmitterWithSource = (source: string): Emitter => {
  const addSource = withSource(source);

  return {
    ...Emitter,
    emit: (event, data = EMPTY_PAYLOAD) => {
      Emitter.emit(event, addSource(data));
    },
  };
};

export { createLogEmitter, createEmitterWithSource };

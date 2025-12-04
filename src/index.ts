import type {
  WorkhorseConfig,
  LogLevel,
  BackoffSettings,
  DuplicateStrategy,
  TaskExecutorStrategy,
} from './types.ts';
import { defaultOptions } from './config.ts';
import { createWorkhorse } from './workhorse.ts';

export type { WorkhorseConfig, LogLevel, BackoffSettings, DuplicateStrategy, TaskExecutorStrategy };
export { defaultOptions, createWorkhorse };

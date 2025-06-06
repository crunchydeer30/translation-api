import { TranslationCreatedHandler } from './translation-created';
import { TaskCompletedHandler } from './task-completed';
import { TaskFailedHandler } from './task-failed';

export const TranslationEventHandlers = [
  TranslationCreatedHandler,
  TaskCompletedHandler,
  TaskFailedHandler,
];

export * from './translation-created';
export * from './task-completed';

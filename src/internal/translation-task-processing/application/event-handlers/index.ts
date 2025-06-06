import { TaskCreatedHandler } from './task-created.handler';
import { TaskReconstructionStartedHandler } from './task-reconstruction-started.handler';

export * from './task-created.handler';
export * from './task-reconstruction-started.handler';

export const TranslationTaskProcessingEventHandlers = [
  TaskCreatedHandler,
  TaskReconstructionStartedHandler,
];

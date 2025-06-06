import { ProcessHtmlTaskHandler } from './process-html-task/process-html-task.handler';
import { ProcessTextTaskHandler } from './process-text-task';
import { ProcessXliffTaskHandler } from './process-xliff-task';
import { ReconstructTextTaskHandler } from './reconstruct-text-task';
import { ReconstructHtmlTaskHandler } from './reconstruct-html-task';
import { ReconstructXliffTaskHandler } from './reconstruct-xliff-task';

export * from './process-html-task';
export * from './process-text-task';
export * from './base-reconstruct-task';
export * from './reconstruct-text-task';
export * from './reconstruct-html-task';
export * from './reconstruct-xliff-task';

export const TranslationTaskProcessingCommandHandlers = [
  ProcessHtmlTaskHandler,
  ProcessTextTaskHandler,
  ProcessXliffTaskHandler,
  ReconstructTextTaskHandler,
  ReconstructHtmlTaskHandler,
  ReconstructXliffTaskHandler,
];

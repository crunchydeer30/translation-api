import {
  BaseReconstructTaskCommand,
  BaseReconstructTaskResponse,
} from '../base-reconstruct-task';

export class ReconstructXliffTaskCommand extends BaseReconstructTaskCommand {
  constructor(public readonly taskId: string) {
    super(taskId);
  }
}

export type ReconstructXliffTaskResponse = BaseReconstructTaskResponse;

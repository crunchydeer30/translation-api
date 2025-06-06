export class TaskFailedEvent {
  constructor(
    public readonly payload: {
      taskId: string;
      errorMessage: string;
      errorCode?: string;
      previousStage?: string;
      previousStatus?: string;
    },
  ) {}
}

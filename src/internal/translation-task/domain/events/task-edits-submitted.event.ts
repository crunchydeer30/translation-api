export class TaskEditsSubmittedEvent {
  constructor(
    public readonly payload: {
      taskId: string;
      editorId?: string;
      segmentCount: number;
    },
  ) {}
}

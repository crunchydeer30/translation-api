import { AggregateRoot } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import {
  TranslationStage,
  TranslationTaskStatus,
  TranslationTaskType,
} from '@prisma/client';
import {
  TaskCanceledEvent,
  TaskCompletedEvent,
  TaskEditingStartedEvent,
  TaskMachineTranslationStartedEvent,
  TaskProcessingCompletedEvent,
  TaskFailedEvent,
  TaskProcessingStartedEvent,
  TaskQueuedForEditingEvent,
  TaskRejectedEvent,
  TaskCreatedEvent,
  EvaluationTaskCompletedEvent,
  TaskReconstructionStartedEvent,
  TaskReconstructionCompletedEvent,
} from '../events';
import { v4 as uuidv4 } from 'uuid';
import { DomainException } from '@common/exceptions';
import { ERRORS } from 'libs/contracts/common/errors/errors';
import type { OriginalStructure } from 'src/internal/translation-task-processing/domain/interfaces/original-structure.interface';

export interface ITranslationTask {
  id: string;
  originalContent: string;
  type: TranslationTaskType;
  originalStructure?: OriginalStructure | null;
  finalContent?: string | null;
  skipEditing: boolean;
  currentStage: TranslationStage;
  status: TranslationTaskStatus;
  languagePairId: string;
  editorId?: string | null;
  isEvaluationTask: boolean;

  editorAssignedAt?: Date | null;
  editorCompletedAt?: Date | null;
  assignedAt?: Date | null;
  completedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;

  rejectionReason?: string | null;
  errorMessage?: string | null;
}

export interface ITranslationTaskCreateArgs {
  id?: string;
  originalContent: string;
  taskType: TranslationTaskType;
  originalStructure: OriginalStructure | null;
  finalContent?: string | null;
  skipEditing?: boolean;
  languagePairId: string;
  currentStage?: TranslationStage;
  status?: TranslationTaskStatus;
  editorId?: string | null;
  isEvaluationTask?: boolean;

  editorAssignedAt?: Date | null;
  editorCompletedAt?: Date | null;
  assignedAt?: Date | null;
  completedAt?: Date | null;
}

export class TranslationTask extends AggregateRoot implements ITranslationTask {
  private readonly logger = new Logger(TranslationTask.name);

  public id: string;
  public originalContent: string;
  public type: TranslationTaskType;
  public originalStructure?: OriginalStructure | null;
  public finalContent?: string | null;
  public skipEditing: boolean;
  public currentStage: TranslationStage;
  public status: TranslationTaskStatus;
  public orderId: string;
  public languagePairId: string;
  public editorId?: string | null;
  public isEvaluationTask: boolean;

  public editorAssignedAt?: Date | null;
  public editorCompletedAt?: Date | null;
  public assignedAt?: Date | null;
  public completedAt?: Date | null;

  public createdAt: Date;
  public updatedAt: Date;

  public rejectionReason?: string | null;
  public errorMessage?: string | null;

  constructor(properties: ITranslationTask) {
    super();
    Object.assign(this, properties);
  }

  public static reconstitute(properties: ITranslationTask): TranslationTask {
    return new TranslationTask(properties);
  }

  public static create(args: ITranslationTaskCreateArgs): TranslationTask {
    const id = args.id || uuidv4();
    const now = new Date();

    const task = new TranslationTask({
      id,
      originalContent: args.originalContent,
      type: args.taskType,
      originalStructure: args.originalStructure ?? null,
      finalContent: args.finalContent ?? null,
      skipEditing: args.skipEditing ?? false,
      currentStage: args.currentStage ?? TranslationStage.QUEUED_FOR_PROCESSING,
      status: args.status ?? TranslationTaskStatus.NEW,
      languagePairId: args.languagePairId,
      editorId: args.editorId ?? null,
      isEvaluationTask: args.isEvaluationTask ?? false,
      editorAssignedAt: args.editorAssignedAt ?? null,
      editorCompletedAt: args.editorCompletedAt ?? null,
      assignedAt: args.assignedAt ?? null,
      completedAt: args.completedAt ?? null,
      createdAt: now,
      updatedAt: now,
      rejectionReason: null,
      errorMessage: null,
    });

    task.apply(new TaskCreatedEvent({ taskId: id, taskType: args.taskType }));
    return task;
  }

  private ensureStage(expected: TranslationStage, action: string) {
    if (this.currentStage !== expected) {
      throw new DomainException(
        ERRORS.COMMON.INVALID_STATE,
        `Cannot ${action}: expected stage ${expected} but is ${this.currentStage}`,
      );
    }
  }

  private ensureStatus(expected: TranslationTaskStatus, action: string) {
    if (this.status !== expected) {
      const logger = new Logger(TranslationTask.name);
      logger.error(
        `Cannot ${action}: expected status ${expected} but is ${this.status}`,
      );
      throw new DomainException(
        ERRORS.COMMON.INVALID_STATE,
        `Cannot ${action}: expected status ${expected} but is ${this.status}`,
      );
    }
  }

  public startProcessing(): void {
    this.ensureStage(
      TranslationStage.QUEUED_FOR_PROCESSING,
      'start processing',
    );
    this.ensureStatus(TranslationTaskStatus.NEW, 'start processing');

    this.status = TranslationTaskStatus.IN_PROGRESS;
    this.currentStage = TranslationStage.PROCESSING;

    this.apply(
      new TaskProcessingStartedEvent({
        taskId: this.id,
        previousStatus: TranslationTaskStatus.NEW,
        previousStage: TranslationStage.QUEUED_FOR_PROCESSING,
      }),
    );
  }

  public completeProcessing(): void {
    this.ensureStage(TranslationStage.PROCESSING, 'mark processing complete');
    this.ensureStatus(
      TranslationTaskStatus.IN_PROGRESS,
      'mark processing complete',
    );

    this.currentStage = TranslationStage.QUEUED_FOR_MT;
    this.status = TranslationTaskStatus.IN_PROGRESS;

    this.apply(
      new TaskProcessingCompletedEvent({
        taskId: this.id,
        previousStatus: TranslationTaskStatus.IN_PROGRESS,
      }),
    );
  }

  public startMachineTranslation(): void {
    this.ensureStage(
      TranslationStage.QUEUED_FOR_MT,
      'start machine translation',
    );
    this.ensureStatus(
      TranslationTaskStatus.IN_PROGRESS,
      'start machine translation',
    );

    this.status = TranslationTaskStatus.IN_PROGRESS;
    this.currentStage = TranslationStage.MACHINE_TRANSLATING;

    this.apply(
      new TaskMachineTranslationStartedEvent({
        taskId: this.id,
        previousStatus: TranslationTaskStatus.NEW,
        previousStage: TranslationStage.QUEUED_FOR_MT,
      }),
    );
  }

  public completeMachineTranslation(): void {
    this.ensureStage(
      TranslationStage.MACHINE_TRANSLATING,
      'complete machine translation',
    );
    this.ensureStatus(
      TranslationTaskStatus.IN_PROGRESS,
      'complete machine translation',
    );

    this.updatedAt = new Date();

    if (this.skipEditing) {
      this.currentStage = TranslationStage.RECONSTRUCTING;

      this.apply(
        new TaskReconstructionStartedEvent({
          taskId: this.id,
          previousStatus: TranslationTaskStatus.IN_PROGRESS,
          previousStage: TranslationStage.MACHINE_TRANSLATING,
        }),
      );
    } else {
      this.currentStage = TranslationStage.QUEUED_FOR_EDITING;

      this.apply(
        new TaskQueuedForEditingEvent({
          taskId: this.id,
          previousStatus: TranslationTaskStatus.IN_PROGRESS,
          previousStage: TranslationStage.MACHINE_TRANSLATING,
        }),
      );
    }
  }

  public startEditing(editorId: string): void {
    this.ensureStage(TranslationStage.QUEUED_FOR_EDITING, 'start editing');

    this.editorId = editorId;
    this.assignedAt = new Date();
    this.editorAssignedAt = new Date();
    this.status = TranslationTaskStatus.IN_PROGRESS;
    this.currentStage = TranslationStage.EDITING;

    this.apply(
      new TaskEditingStartedEvent({
        taskId: this.id,
        editorId,
        previousStatus: TranslationTaskStatus.NEW,
        previousStage: TranslationStage.QUEUED_FOR_EDITING,
      }),
    );
  }

  public completeTask(): void {
    this.status = TranslationTaskStatus.COMPLETED;
    this.currentStage = TranslationStage.COMPLETED;
    this.editorCompletedAt = new Date();

    if (this.isEvaluationTask) {
      this.apply(
        new EvaluationTaskCompletedEvent({
          taskId: this.id,
          editorId: this.editorId!,
        }),
      );
    } else {
      console.log('applying event here');
      this.apply(
        new TaskCompletedEvent({
          taskId: this.id,
          editorId: this.editorId!,
          previousStatus: TranslationTaskStatus.IN_PROGRESS,
          previousStage: TranslationStage.EDITING,
        }),
      );
    }
  }

  public rejectTask(reason: string): void {
    this.ensureStatus(TranslationTaskStatus.IN_PROGRESS, 'reject task');

    this.status = TranslationTaskStatus.REJECTED;
    this.currentStage = TranslationStage.CANCELED;
    this.rejectionReason = reason;

    this.apply(
      new TaskRejectedEvent({
        taskId: this.id,
        rejectionReason: reason,
        previousStatus: TranslationTaskStatus.IN_PROGRESS,
      }),
    );
  }

  public markAsFailed(errorMessage: string, errorCode?: string): void {
    const previousStage = this.currentStage;
    const previousStatus = this.status;

    this.status = TranslationTaskStatus.ERROR;
    this.errorMessage = errorMessage;

    this.apply(
      new TaskFailedEvent({
        taskId: this.id,
        errorMessage,
        errorCode,
        previousStage,
        previousStatus,
      }),
    );
  }

  public cancelTask(reason?: string): void {
    if (this.status !== TranslationTaskStatus.IN_PROGRESS) {
      throw new DomainException(
        ERRORS.TRANSLATION_TASK.INVALID_STATUS_TRANSITION,
      );
    }

    this.status = TranslationTaskStatus.CANCELED;
    this.currentStage = TranslationStage.CANCELED;

    this.apply(
      new TaskCanceledEvent({
        taskId: this.id,
        cancellationReason: reason,
      }),
    );
  }

  public submitEdits(
    segmentEdits: Array<{ segmentId: string; editedContent: string }>,
  ): void {
    this.ensureStage(TranslationStage.EDITING, 'submit edits');
    this.ensureStatus(TranslationTaskStatus.IN_PROGRESS, 'submit edits');

    if (!this.editorId) {
      throw new DomainException(ERRORS.TRANSLATION_TASK.NOT_ASSIGNED_TO_EDITOR);
    }

    this.currentStage = TranslationStage.RECONSTRUCTING;
    this.updatedAt = new Date();

    this.apply(
      new TaskReconstructionStartedEvent({
        taskId: this.id,
        previousStatus: TranslationTaskStatus.IN_PROGRESS,
        previousStage: TranslationStage.MACHINE_TRANSLATING,
      }),
    );
  }

  public completeReconstruction(finalContent: string): void {
    this.ensureStage(
      TranslationStage.RECONSTRUCTING,
      'complete reconstruction',
    );
    this.ensureStatus(
      TranslationTaskStatus.IN_PROGRESS,
      'complete reconstruction',
    );

    this.finalContent = finalContent;

    this.apply(
      new TaskReconstructionCompletedEvent({
        taskId: this.id,
        previousStatus: TranslationTaskStatus.IN_PROGRESS,
        previousStage: TranslationStage.RECONSTRUCTING,
      }),
    );
  }
}

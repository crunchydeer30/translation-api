import {
  EventsHandler,
  IEventHandler,
  CommandBus,
  EventPublisher,
} from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { TaskReconstructionStartedEvent } from '../../../translation-task/domain/events';
import { TranslationTaskRepository } from '../../../translation-task/infrastructure/repositories/translation-task.repository';
import { ReconstructTextTaskCommand } from '../commands/reconstruct-text-task';
import { ReconstructHtmlTaskCommand } from '../commands/reconstruct-html-task';
import { ReconstructXliffTaskCommand } from '../commands/reconstruct-xliff-task';
import { TranslationTaskType } from '@prisma/client';
import { DomainException } from '@common/exceptions';
import { ERRORS } from 'libs/contracts/common/errors/errors';

@EventsHandler(TaskReconstructionStartedEvent)
export class TaskReconstructionStartedHandler
  implements IEventHandler<TaskReconstructionStartedEvent>
{
  private readonly logger = new Logger(TaskReconstructionStartedHandler.name);

  constructor(
    private readonly translationTaskRepository: TranslationTaskRepository,
    private readonly commandBus: CommandBus,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async handle(event: TaskReconstructionStartedEvent): Promise<void> {
    const { taskId } = event.payload;

    try {
      const task = await this.translationTaskRepository.findById(taskId);

      if (!task) {
        throw new DomainException(ERRORS.TRANSLATION_TASK.NOT_FOUND);
      }

      let finalContent: string;
      let result: { finalContent: string };

      switch (task.type) {
        case TranslationTaskType.PLAIN_TEXT:
          result = await this.commandBus.execute<
            ReconstructTextTaskCommand,
            { finalContent: string }
          >(new ReconstructTextTaskCommand(taskId));
          finalContent = result.finalContent;
          break;

        case TranslationTaskType.HTML:
          result = await this.commandBus.execute<
            ReconstructHtmlTaskCommand,
            { finalContent: string }
          >(new ReconstructHtmlTaskCommand(taskId));
          finalContent = result.finalContent;
          break;

        case TranslationTaskType.XLIFF:
          result = await this.commandBus.execute<
            ReconstructXliffTaskCommand,
            { finalContent: string }
          >(new ReconstructXliffTaskCommand(taskId));
          finalContent = result.finalContent;
          break;

        default:
          this.logger.warn(
            `Automatic reconstruction not implemented for task type ${task.type}`,
          );
          return;
      }

      const taskWithEvents = this.eventPublisher.mergeObjectContext(task);

      taskWithEvents.completeReconstruction(finalContent);

      await this.translationTaskRepository.save(taskWithEvents);
      taskWithEvents.commit();

      this.logger.log(
        `Successfully completed automatic reconstruction for MT-only task ${taskId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to automatically reconstruct task ${taskId}: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
      );
    }
  }
}

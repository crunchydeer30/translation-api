import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { TaskCompletedEvent } from 'src/internal/translation-task/domain/events';
import { TranslationRepository } from 'src/internal/translation/infrastructure/repositories';
import { TranslationTaskRepository } from 'src/internal/translation-task/infrastructure';
import { DomainException } from '@common/exceptions';
import { ERRORS } from 'libs/contracts/common';

@EventsHandler(TaskCompletedEvent)
export class TaskCompletedHandler implements IEventHandler<TaskCompletedEvent> {
  private readonly logger = new Logger(TaskCompletedHandler.name);

  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly translationTaskRepository: TranslationTaskRepository,
  ) {}

  async handle(event: TaskCompletedEvent): Promise<void> {
    const { taskId } = event.payload;
    this.logger.log(`Handling TaskCompletedEvent for task ${taskId}`);

    try {
      const task = await this.translationTaskRepository.findById(taskId);

      if (!task) {
        throw new DomainException(ERRORS.TRANSLATION_TASK.NOT_FOUND);
      }

      const translation =
        await this.translationRepository.findByTranslationTaskId(taskId);

      if (!translation) {
        this.logger.warn(
          `No translation found for completed task ${taskId}. This may be normal for other task types.`,
        );
        return;
      }

      if (!task.finalContent) {
        this.logger.warn(
          `Task ${taskId} is marked as completed but has no final content`,
        );
        return;
      }

      translation.complete(task.finalContent);
      await this.translationRepository.save(translation);

      this.logger.log(
        `Updated translation ${translation.id} with final content from task ${taskId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process TaskCompletedEvent: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }
}

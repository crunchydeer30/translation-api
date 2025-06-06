import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { TaskFailedEvent } from 'src/internal/translation-task/domain/events';
import { TranslationRepository } from 'src/internal/translation/infrastructure';
import { TranslationStatus } from '@prisma/client';

@EventsHandler(TaskFailedEvent)
export class TaskFailedHandler implements IEventHandler<TaskFailedEvent> {
  private readonly logger = new Logger(TaskFailedHandler.name);

  constructor(private readonly translationRepository: TranslationRepository) {}

  async handle(event: TaskFailedEvent): Promise<void> {
    const { taskId } = event.payload;
    this.logger.log(`Handling TaskFailedEvent for task ${taskId}`);

    try {
      const translation =
        await this.translationRepository.findByTranslationTaskId(taskId);

      if (!translation) {
        return;
      }

      translation.status = TranslationStatus.ERROR;
      translation.updatedAt = new Date();
      await this.translationRepository.save(translation);

      this.logger.log(
        `Set translation ${translation.id} status to ERROR due to task ${taskId} failure`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process TaskFailedEvent: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }
}

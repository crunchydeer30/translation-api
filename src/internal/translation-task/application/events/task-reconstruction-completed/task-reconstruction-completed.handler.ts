import { EventPublisher, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { TaskReconstructionCompletedEvent } from 'src/internal/translation-task/domain/events';
import { TranslationTaskRepository } from 'src/internal/translation-task/infrastructure';
import { DomainException } from '@common/exceptions';
import { ERRORS } from 'libs/contracts/common';

@EventsHandler(TaskReconstructionCompletedEvent)
export class TaskReconstructionCompletedHandler
  implements IEventHandler<TaskReconstructionCompletedEvent>
{
  private readonly logger = new Logger(TaskReconstructionCompletedHandler.name);

  constructor(
    private readonly translationTaskRepository: TranslationTaskRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async handle(event: TaskReconstructionCompletedEvent): Promise<void> {
    const { taskId } = event.payload;
    this.logger.log(
      `Handling TaskReconstructionCompletedEvent for task ${taskId}`,
    );

    try {
      const task = await this.translationTaskRepository.findById(taskId);

      if (!task) {
        throw new DomainException(ERRORS.TRANSLATION_TASK.NOT_FOUND);
      }

      this.eventPublisher.mergeObjectContext(task);

      task.completeTask();
      await this.translationTaskRepository.save(task);
      task.commit();

      this.logger.log(
        `Task ${taskId} marked as completed after reconstruction`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process TaskReconstructionCompletedEvent: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }
}

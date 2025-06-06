import { CommandBus, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { TranslationTaskRepository } from 'src/internal/translation-task/infrastructure/repositories/translation-task.repository';
import { ISensitiveDataMappingRepository } from '../../../domain/ports/sensitive-data-mapping.repository';
import { ITranslationTaskSegmentRepository } from '../../../domain/ports/translation-task-segment.repository';
import { TranslationTask } from 'src/internal/translation-task/domain';
import { SegmentDto } from '../../services/html-parsing.service';
import {
  BaseReconstructTaskCommand,
  BaseReconstructTaskResponse,
} from './base-reconstruct-task.command';

export abstract class BaseReconstructTaskHandler
  implements
    ICommandHandler<BaseReconstructTaskCommand, BaseReconstructTaskResponse>
{
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly translationTaskRepository: TranslationTaskRepository,
    protected readonly segmentRepository: ITranslationTaskSegmentRepository,
    protected readonly sensitiveDataMappingRepository: ISensitiveDataMappingRepository,
    protected readonly commandBus: CommandBus,
    protected readonly eventPublisher: EventPublisher,
  ) {}

  async execute(
    command: BaseReconstructTaskCommand,
  ): Promise<BaseReconstructTaskResponse> {
    const { taskId } = command;
    const task = await this.translationTaskRepository.findById(taskId);

    try {
      if (!task) {
        throw new Error(
          `Failed to reconstruct task "${taskId}". Task not found`,
        );
      }
      this.eventPublisher.mergeObjectContext(task);

      this.logger.log(`Reconstructing task ${taskId}`);

      const segmentEntities =
        await this.segmentRepository.findByTranslationTaskId(taskId);

      const segments: SegmentDto[] = segmentEntities.map((segment) => {
        const targetContent =
          segment.editedContent ||
          segment.machineTranslatedContent ||
          undefined;

        return {
          id: segment.id,
          segmentOrder: segment.segmentOrder,
          segmentType: segment.segmentType,
          sourceContent: segment.sourceContent,
          targetContent,
          specialTokensMap: segment.specialTokensMap || undefined,
          formatMetadata: segment.formatMetadata || undefined,
        };
      });

      const finalContent = await this.reconstruct(task, segments);

      task.completeReconstruction(finalContent);
      await this.translationTaskRepository.save(task);
      task.commit();

      return {
        taskId: task.id,
        finalContent,
      };
    } catch (error) {
      if (task) {
        task.markAsFailed(JSON.stringify(error));
        await this.translationTaskRepository.save(task);
        task.commit();
      }
      this.logger.error(
        `Error reconstructing task ${taskId}: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  protected abstract reconstruct(
    task: TranslationTask,
    segments: SegmentDto[],
  ): Promise<string>;
}

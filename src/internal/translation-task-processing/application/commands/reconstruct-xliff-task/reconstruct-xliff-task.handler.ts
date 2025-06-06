import { Injectable } from '@nestjs/common';
import { CommandBus, CommandHandler, EventPublisher } from '@nestjs/cqrs';
import { ReconstructXliffTaskCommand } from './reconstruct-xliff-task.command';
import { BaseReconstructTaskHandler } from '../base-reconstruct-task';
import { TranslationTaskRepository } from 'src/internal/translation-task/infrastructure/repositories/translation-task.repository';
import { TranslationTaskSegmentRepository } from 'src/internal/translation-task-processing/infrastructure/repositories/translation-task-segment.repository';
import { SensitiveDataMappingRepository } from 'src/internal/translation-task-processing/infrastructure/repositories/sensitive-data-mapping.repository';
import { XliffParsingService } from '../../services/xliff-parsing.service';
import { TranslationTask } from 'src/internal/translation-task/domain';
import { SegmentDto } from '../../services/html-parsing.service';
import { XliffDocumentMetadata } from 'src/internal/translation-task-processing/domain/interfaces/xliff-structure.interface';

@Injectable()
@CommandHandler(ReconstructXliffTaskCommand)
export class ReconstructXliffTaskHandler extends BaseReconstructTaskHandler {
  constructor(
    protected readonly translationTaskRepository: TranslationTaskRepository,
    protected readonly segmentRepository: TranslationTaskSegmentRepository,
    protected readonly sensitiveDataMappingRepository: SensitiveDataMappingRepository,
    protected readonly commandBus: CommandBus,
    protected readonly eventPublisher: EventPublisher,
    private readonly xliffParsingService: XliffParsingService,
  ) {
    super(
      translationTaskRepository,
      segmentRepository,
      sensitiveDataMappingRepository,
      commandBus,
      eventPublisher,
    );
  }

  protected async reconstruct(
    task: TranslationTask,
    segments: SegmentDto[],
  ): Promise<string> {
    const originalStructure =
      task.originalStructure as unknown as XliffDocumentMetadata;

    this.logger.log(
      `Reconstructing XLIFF task ${task.id} with ${segments.length} segments`,
    );

    const processedSegments: SegmentDto[] = await Promise.all(
      segments.map(async (s) => {
        const mappings =
          await this.sensitiveDataMappingRepository.findBySegmentId(s.id);
        let content = s.targetContent ?? s.sourceContent;

        if (mappings.length > 0) {
          content = content.replace(
            new RegExp(
              mappings
                .map((m) =>
                  m.tokenIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                )
                .join('|'),
              'g',
            ),
            (match) =>
              mappings.find((m) => m.tokenIdentifier === match)!.originalValue,
          );
        }

        return { ...s, targetContent: content };
      }),
    );

    return this.xliffParsingService.reconstructXliffContent(
      processedSegments,
      originalStructure,
    );
  }
}

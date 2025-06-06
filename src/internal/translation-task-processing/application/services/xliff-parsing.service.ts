/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { v4 as uuidv4 } from 'uuid';
import { SegmentDto } from './html-parsing.service';
import { ContentSegmentType } from '@prisma/client';
import { XliffDocumentMetadata } from 'src/internal/translation-task-processing/domain/interfaces/xliff-structure.interface';
import {
  FormatMetadata,
  XliffFormatMetadata,
} from 'src/internal/translation-task-processing/domain/interfaces/format-metadata.interface';

export interface XliffParsingResult {
  segments: SegmentDto[];
  metadata: XliffDocumentMetadata;
}

@Injectable()
export class XliffParsingService {
  private readonly logger = new Logger(XliffParsingService.name);

  parse(xmlContent: string): XliffParsingResult {
    if (!xmlContent || xmlContent.trim() === '') {
      this.logger.error('Empty XLIFF content provided');
      throw new Error('Empty XLIFF content provided');
    }
    this.logger.debug(`Parsing XLIFF content of length ${xmlContent.length}`);
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    const json = parser.parse(xmlContent) as any;
    const xliff = json.xliff as any;

    if (!xliff) {
      this.logger.error(
        `Failed to parse XLIFF content: ${JSON.stringify(json).substring(0, 200)}`,
      );
      throw new Error('Invalid XLIFF format: root xliff element not found');
    }

    const version = xliff['@_version'] as string;
    const xmlns = xliff['@_xmlns'] as string | undefined;
    const files = Array.isArray(xliff.file) ? xliff.file : [xliff.file];

    const segments: SegmentDto[] = [];
    let segmentOrder = 0;
    files.forEach((file) => {
      const fileId = file['@_id'];
      let units: any[] = [];

      if (file.body) {
        const bodies = Array.isArray(file.body) ? file.body : [file.body];
        bodies.forEach((body) => {
          const tuElements = body['trans-unit'] || body['transUnit'];
          if (tuElements) {
            const tus = Array.isArray(tuElements) ? tuElements : [tuElements];
            units = units.concat(tus);
          }
        });
      }

      if (file.unit) {
        units = units.concat(
          Array.isArray(file.unit) ? file.unit : [file.unit],
        );
      }

      if (file.group) {
        const groups = Array.isArray(file.group) ? file.group : [file.group];
        groups.forEach((g) => {
          const groupId = g['@_id'];
          if (g.unit) {
            const us = Array.isArray(g.unit) ? g.unit : [g.unit];
            units = units.concat(us.map((u) => ({ ...u, groupId })));
          }
        });
      }

      units.forEach((u) => {
        segmentOrder++;
        const unitId = u['@_id'];

        this.logger.debug(`Unit ${unitId} raw structure: ${JSON.stringify(u)}`);

        let sourceContent = 'Placeholder text';

        if (u.segment && typeof u.segment === 'object') {
          this.logger.debug('Found XLIFF 2.0 structure with segment container');

          if (typeof u.segment.source === 'string') {
            sourceContent = u.segment.source;
            this.logger.debug('XLIFF 2.0: Source found as string in segment');
          } else if (u.segment.source && typeof u.segment.source === 'object') {
            if (u.segment.source['#text'] !== undefined) {
              sourceContent = u.segment.source['#text'];
            } else if (u.segment.source._ !== undefined) {
              sourceContent = u.segment.source._;
            } else {
              sourceContent = JSON.stringify(u.segment.source);
            }
          }
        } else if (u.source !== undefined) {
          if (typeof u.source === 'string') {
            sourceContent = u.source;
            this.logger.debug('XLIFF 1.x: Source found as string');
          } else if (u.source && typeof u.source === 'object') {
            if (u.source['#text'] !== undefined) {
              sourceContent = u.source['#text'];
              this.logger.debug('XLIFF 1.x: Source found as object with #text');
            } else if (u.source._ !== undefined) {
              sourceContent = u.source._;
              this.logger.debug('XLIFF 1.x: Source found as object with _');
            } else if (u.source.text !== undefined) {
              sourceContent = u.source.text;
              this.logger.debug('XLIFF 1.x: Source found as object with text');
            } else {
              sourceContent = `Unparsed source: ${JSON.stringify(u.source)}`;
              this.logger.debug(
                'XLIFF 1.x: Source found as complex object, using stringified version',
              );
            }
          }
        } else if (u.seg !== undefined) {
          sourceContent =
            typeof u.seg === 'string'
              ? u.seg
              : `Unparsed seg: ${JSON.stringify(u.seg)}`;
          this.logger.debug('Source found as seg element');
        } else if (u.target !== undefined) {
          sourceContent =
            typeof u.target === 'string'
              ? u.target
              : `Unparsed target: ${JSON.stringify(u.target)}`;
          this.logger.debug('Falling back to target element');
        } else {
          sourceContent = `No source found. Unit data: ${JSON.stringify(u).substring(0, 100)}`;
          this.logger.warn(`No source content found in unit ${unitId}`);
        }

        this.logger.debug(
          `Final extracted source content for unit ${unitId}: "${sourceContent}"`,
        );

        const metadata: FormatMetadata = {
          fileId,
          unitId,
          groupId: u.groupId,
        };

        segments.push({
          id: uuidv4(),
          segmentOrder,
          segmentType: ContentSegmentType.XLIFF_UNIT,
          sourceContent,
          formatMetadata: metadata,
        });
      });
    });

    const firstFile = files[0];
    let sourceLanguage = firstFile['@_source-language'];
    let targetLanguage = firstFile['@_target-language'];

    if (version && version.startsWith('2.')) {
      sourceLanguage = xliff['@_srcLang'] || sourceLanguage;
      targetLanguage = xliff['@_trgLang'] || targetLanguage;
    }

    const metadata: XliffDocumentMetadata = {
      version,
      xmlns,
      sourceLanguage,
      targetLanguage,
      originalFile: firstFile['@_original'] ?? firstFile['@_original-file'],
      datatype: firstFile['@_datatype'],
      toolId: firstFile['@_tool-id'],
      toolName: firstFile['@_tool-name'],
      toolVersion: firstFile['@_tool-version'],
    };

    return { segments, metadata };
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  public reconstructXliffContent(
    segments: SegmentDto[],
    metadata: XliffDocumentMetadata,
  ): string {
    const isXliff1 = metadata.version && metadata.version.startsWith('1.');

    let xliff = `<?xml version="1.0" encoding="UTF-8"?>`;
    if (isXliff1) {
      xliff += `<xliff version="${metadata.version}" xmlns="${metadata.xmlns || 'urn:oasis:names:tc:xliff:document:1.2'}">`;
    } else {
      xliff += `<xliff version="${metadata.version || '2.0'}" xmlns="${metadata.xmlns || 'urn:oasis:names:tc:xliff:document:2.0'}">`;
    }

    const byFile = segments.reduce(
      (acc, seg) => {
        const meta = seg.formatMetadata as XliffFormatMetadata | undefined;
        const fileId = meta?.fileId || '';
        if (!acc[fileId]) acc[fileId] = [];
        acc[fileId].push(seg);
        return acc;
      },
      {} as Record<string, SegmentDto[]>,
    );

    for (const fileId in byFile) {
      xliff += `<file id="${fileId}" source-language="${metadata.sourceLanguage}" target-language="${metadata.targetLanguage}"`;
      if (metadata.originalFile)
        xliff += ` original="${metadata.originalFile}"`;
      if (metadata.datatype) xliff += ` datatype="${metadata.datatype}"`;
      if (metadata.toolId) xliff += ` tool-id="${metadata.toolId}"`;
      if (metadata.toolName) xliff += ` tool-name="${metadata.toolName}"`;
      if (metadata.toolVersion)
        xliff += ` tool-version="${metadata.toolVersion}"`;
      xliff += `>`;

      if (isXliff1) {
        xliff += `<body>`;
      }

      byFile[fileId].forEach((seg) => {
        const meta = seg.formatMetadata as XliffFormatMetadata | undefined;
        const unitId = meta?.unitId || '';
        const target = (seg as any).targetContent as string | undefined;

        if (isXliff1) {
          xliff += `<trans-unit id="${unitId}">`;

          xliff += `<source>${this.escapeXml(seg.sourceContent)}</source>`;
          if (target !== undefined) {
            xliff += `<target>${this.escapeXml(target)}</target>`;
          }
          xliff += `</trans-unit>`;
        } else {
          xliff += `<unit id="${unitId}">`;
          xliff += `<segment>`;

          xliff += `<source>${this.escapeXml(seg.sourceContent)}</source>`;
          if (target !== undefined) {
            xliff += `<target>${this.escapeXml(target)}</target>`;
          }
          xliff += `</segment>`;
          xliff += `</unit>`;
        }
      });

      if (isXliff1) {
        xliff += `</body>`;
      }

      xliff += `</file>`;
    }

    xliff += `</xliff>`;
    return xliff;
  }
}

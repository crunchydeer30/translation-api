import { Test, TestingModule } from '@nestjs/testing';
import { TextParsingService, TextParsingResult } from './text-parsing.service';
import { v4 as uuidv4 } from 'uuid';
import { ContentSegmentType } from '@prisma/client';

describe('TextParsingService', () => {
  let service: TextParsingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TextParsingService],
    }).compile();

    service = module.get<TextParsingService>(TextParsingService);
  });

  describe('parse', () => {
    it('should parse a single line into one segment', () => {
      const text = 'Hello world.';
      const result: TextParsingResult = service.parse(text);

      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].sourceContent).toBe('Hello world.');
      expect(result.originalStructure.paragraphs).toEqual(['Hello world.']);
    });

    it('should parse multiple paragraphs separated by double newlines', () => {
      const text = 'First paragraph.\n\nSecond paragraph.';
      const result: TextParsingResult = service.parse(text);

      expect(result.segments).toHaveLength(2);
      expect(result.segments[0].sourceContent).toBe('First paragraph.');
      expect(result.segments[1].sourceContent).toBe('Second paragraph.');
      expect(result.originalStructure.paragraphs).toEqual([
        'First paragraph.',
        'Second paragraph.',
      ]);
    });

    it('should return empty segments and paragraphs for empty input', () => {
      const text = '';
      const result: TextParsingResult = service.parse(text);
      expect(result.segments).toHaveLength(0);
      expect(result.originalStructure.paragraphs).toEqual([]);
    });
  });

  describe('reconstructPlainTextContent', () => {
    it('should reconstruct text from segments with proper newlines', () => {
      const segments = [
        {
          id: uuidv4(),
          segmentOrder: 1,
          segmentType: ContentSegmentType.TEXT,
          sourceContent: 'Hello',
          formatMetadata: { paragraph: 1, precedingNewlines: 0 },
        },
        {
          id: uuidv4(),
          segmentOrder: 2,
          segmentType: ContentSegmentType.TEXT,
          sourceContent: 'World',
          formatMetadata: { paragraph: 2, precedingNewlines: 2 },
        },
      ];

      const reconstructed = service.reconstructPlainTextContent(segments);
      expect(reconstructed).toBe('Hello' + '\n\n' + 'World');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { XliffParsingService } from './xliff-parsing.service';
import { ContentSegmentType } from '@prisma/client';

describe('XliffParsingService', () => {
  let service: XliffParsingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [XliffParsingService],
    }).compile();

    service = module.get<XliffParsingService>(XliffParsingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parse', () => {
    it('should parse a simple XLIFF 1.2 document with one trans-unit', () => {
      const xliffContent = `<?xml version="1.0" encoding="UTF-8"?>
        <xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
          <file original="myfile.txt" source-language="en" target-language="fr" datatype="plaintext">
            <body>
              <trans-unit id="1">
                <source>Hello world</source>
                <target>Bonjour le monde</target>
              </trans-unit>
            </body>
          </file>
        </xliff>`;

      const result = service.parse(xliffContent);

      expect(result.segments).toHaveLength(1);
      const segment = result.segments[0];
      expect(segment.sourceContent).toBe('Hello world');
      expect(segment.segmentType).toBe(ContentSegmentType.XLIFF_UNIT);
      if (segment.formatMetadata && 'unitId' in segment.formatMetadata) {
        const xliffMetadata = segment.formatMetadata;
        expect(xliffMetadata.unitId).toBe('1');
        expect(xliffMetadata.fileId).toBeUndefined();
      } else {
        fail('formatMetadata is not XliffFormatMetadata');
      }

      expect(result.metadata.version).toBe('1.2');
      expect(result.metadata.sourceLanguage).toBe('en');
      expect(result.metadata.targetLanguage).toBe('fr');
      expect(result.metadata.originalFile).toBe('myfile.txt');
    });

    it('should parse a simple XLIFF 2.0 document with one unit', () => {
      const xliffContent = `<?xml version="1.0" encoding="UTF-8"?>
        <xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en" trgLang="fr">
          <file id="f1" original="myfile.txt">
            <unit id="u1">
              <segment>
                <source>Hello XLIFF 2.0</source>
                <target>Bonjour XLIFF 2.0</target>
              </segment>
            </unit>
          </file>
        </xliff>`;

      const result = service.parse(xliffContent);

      expect(result.segments).toHaveLength(1);
      const segment = result.segments[0];
      expect(segment.sourceContent).toBe('Hello XLIFF 2.0');
      expect(segment.segmentType).toBe(ContentSegmentType.XLIFF_UNIT);
      if (segment.formatMetadata && 'unitId' in segment.formatMetadata) {
        const xliffMetadata = segment.formatMetadata;
        expect(xliffMetadata.unitId).toBe('u1');
        expect(xliffMetadata.fileId).toBe('f1');
      } else {
        fail('formatMetadata is not XliffFormatMetadata');
      }

      expect(result.metadata.version).toBe('2.0');
      expect(result.metadata.sourceLanguage).toBe('en');
      expect(result.metadata.targetLanguage).toBe('fr');
      expect(result.metadata.originalFile).toBe('myfile.txt');
    });

    it('should parse XLIFF 1.2 with inline <g> tag and preserve it', () => {
      const xliffContent = `<?xml version="1.0" encoding="UTF-8"?>
        <xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
          <file original="myfile.txt" source-language="en" target-language="fr" datatype="plaintext">
            <body>
              <trans-unit id="g1">
                <source>Text with <g id="1">bolded</g> part.</source>
              </trans-unit>
            </body>
          </file>
        </xliff>`;

      const result = service.parse(xliffContent);
      expect(result.segments).toHaveLength(1);
    });
  });
});

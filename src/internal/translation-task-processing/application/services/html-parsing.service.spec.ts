import { Test, TestingModule } from '@nestjs/testing';
import { HTMLParsingService } from './html-parsing.service';

describe('HTMLParsingService', () => {
  let service: HTMLParsingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HTMLParsingService],
    }).compile();

    service = module.get<HTMLParsingService>(HTMLParsingService);
  });

  describe('parse', () => {
    it('should parse simple HTML with one paragraph', () => {
      const html = '<p>Hello World</p>';
      const result = service.parse(html);
      expect(result.segments).toBeDefined();
      expect(Array.isArray(result.segments)).toBe(true);
      expect(result.segments.length).toBeGreaterThan(0);

      expect(result.segments[0].sourceContent).toContain('Hello World');

      expect(result.originalStructure).toBeDefined();
      expect(result.originalStructure.children).toBeDefined();
      expect(Array.isArray(result.originalStructure.children)).toBe(true);
    });

    it('should parse HTML with a link and preserve inline elements', () => {
      const html =
        '<p>Click <a href="https://example.com">here</a> for info.</p>';
      const result = service.parse(html);
      expect(result.segments).toBeDefined();
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.originalStructure).toBeDefined();
      expect(result.originalStructure.children.length).toBeGreaterThan(0);
    });

    it('should return empty segments for empty input', () => {
      const html = '';
      const result = service.parse(html);
      expect(result.segments).toHaveLength(0);
    });

    it('should parse HTML with nested table structure', () => {
      const html = '<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>';
      const result = service.parse(html);
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.originalStructure).toBeDefined();
      expect(result.originalStructure.children.length).toBeGreaterThan(0);
      const combinedText = result.segments
        .map((s) => s.sourceContent)
        .join(' ');
      expect(combinedText).toContain('Cell 1');
      expect(combinedText).toContain('Cell 2');
    });

    it('should parse HTML with inline formatting elements', () => {
      const html = '<p>This is a <b>bold</b> move and <i>italic</i> text.</p>';
      const result = service.parse(html);
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.segments[0].sourceContent).toContain('This is a');
      expect(result.segments[0].sourceContent).toContain('bold');
      expect(result.segments[0].sourceContent).toContain('move and');
      expect(result.segments[0].sourceContent).toContain('italic');
      expect(result.originalStructure.children.length).toBeGreaterThan(0);
    });

    it('should parse HTML with multiple block elements sequentially', () => {
      const html =
        '<p>First paragraph.</p><div>Second block.</div><p>Third paragraph.</p>';
      const result = service.parse(html);
      expect(result.segments.length).toBe(3);
      expect(result.segments[0].sourceContent).toBe('First paragraph.');
      expect(result.segments[1].sourceContent).toBe('Second block.');
      expect(result.segments[2].sourceContent).toBe('Third paragraph.');
      expect(result.originalStructure.children.length).toBeGreaterThan(0);
    });

    it('should parse HTML with nested block elements', () => {
      const html =
        '<div><p>Nested paragraph 1.</p><p>Nested paragraph 2.</p></div>';
      const result = service.parse(html);
      expect(result.segments.length).toBe(2);
      expect(result.segments[0].sourceContent).toBe('Nested paragraph 1.');
      expect(result.segments[1].sourceContent).toBe('Nested paragraph 2.');
      expect(result.originalStructure.children.length).toBeGreaterThan(0);

      const bodyElement = result.originalStructure.children[0];
      if (bodyElement && bodyElement.type === 'element') {
        const divStructure = bodyElement.children.find(
          (c) => c.type === 'element' && c.tag === 'div',
        );
        expect(divStructure).toBeDefined();
        if (divStructure && divStructure.type === 'element') {
          expect(divStructure.children.length).toBe(2);
        }
      }
    });

    it('should handle HTML with self-closing tags like <br> and <img> gracefully', () => {
      const html =
        '<p>Line one.<br>Line two.</p><img src="image.png" alt="alt text">';
      const result = service.parse(html);

      expect(result.segments.length).toBe(1);
      expect(result.segments[0].sourceContent).toMatch(
        /^Line one\.<ph id="\d+" type="br"><\/ph>Line two\.$/,
      );
      expect(result.originalStructure.children.length).toBeGreaterThan(0);

      const bodyElement = result.originalStructure.children[0];
      if (bodyElement && bodyElement.type === 'element') {
        const imgStructure = bodyElement.children.find(
          (c) => c.type === 'element' && c.tag === 'img',
        );
        expect(imgStructure).toBeDefined();
        if (imgStructure && imgStructure.type === 'element') {
          expect(imgStructure.attributes.src).toBe('image.png');
        }
      }
    });

    it('should ignore HTML comments during parsing', () => {
      const html =
        '<p>Visible text.</p><!-- This is a comment --><p>More visible text.</p>';
      const result = service.parse(html);
      expect(result.segments.length).toBe(2);
      expect(result.segments[0].sourceContent).toBe('Visible text.');
      expect(result.segments[1].sourceContent).toBe('More visible text.');
    });
  });
});

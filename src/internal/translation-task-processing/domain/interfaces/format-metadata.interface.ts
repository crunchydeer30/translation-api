export interface HtmlFormatMetadata {
  container: string;
  row: number;
  col: number;
}

export interface XliffFormatMetadata {
  fileId?: string;
  unitId: string;
  groupId?: string;
}

export interface CsvFormatMetadata {
  row: number;
  col: number;
}

export interface SrtFormatMetadata {
  sequence: number;
  startTime: string;
  endTime: string;
}

export interface PlainTextFormatMetadata {
  paragraph: number;
  precedingNewlines?: number; // Number of newlines before this paragraph
}

export type FormatMetadata =
  | HtmlFormatMetadata
  | XliffFormatMetadata
  | CsvFormatMetadata
  | SrtFormatMetadata
  | PlainTextFormatMetadata;

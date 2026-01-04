
export enum PageSize {
  A4 = 'A4',
  Letter = 'Letter',
  Legal = 'Legal'
}

export enum Orientation {
  Portrait = 'portrait',
  Landscape = 'landscape'
}

export interface PdfOptions {
  pageSize: PageSize;
  orientation: Orientation;
  margin: number; // in mm
  quality: number; // 0-1
}

export interface ProcessedPage {
  dataUrl: string;
  width: number;
  height: number;
}

export interface ImageMetadata {
  name: string;
  width: number;
  height: number;
  type: string;
  size: number;
}

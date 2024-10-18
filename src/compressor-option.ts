import type { CompressorOptions } from './type';

export const defaultOptions: CompressorOptions = {
  strict: true,
  checkOrientation: true,
  retainExif: false,
  maxWidth: Infinity,
  maxHeight: Infinity,
  minWidth: 0,
  minHeight: 0,
  width: undefined,
  height: undefined,
  resize: 'none',
  quality: 0.8,
  mimeType: 'auto',
  convertTypes: ['image/png'],
  convertSize: 5000000,
  beforeDraw: null,
  drew: null,
  success: null,
  error: null
};

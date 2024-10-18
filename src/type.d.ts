export interface CompressorOptions {
  /**
   * Indicates if output the original image instead of the compressed one
   * when the size of the compressed image is greater than the original one's
   * @default true
   */
  strict?: boolean;
  /**
   * Indicates if read the image's Exif Orientation information,
   * and then rotate or flip the image automatically.
   * @default true
   */
  checkOrientation?: boolean;
  /**
   * Indicates if retain the image's Exif information after compressed.
   * @default false
   */
  retainExif?: boolean;
  /**
   * The max width of the output image.
   * @default Infinity
   */
  maxWidth?: number;
  /**
   * The max height of the output image.
   * @default Infinity
   */
  maxHeight?: number;
  /**
   * The min width of the output image.
   * @default 0
   */
  minWidth?: number;
  /**
   * The min height of the output image.
   * @default 0
   */
  minHeight?: number;
  /**
   * The width of the output image.
   * If not specified, the natural width of the source image will be used.
   */
  width?: number;
  /**
   * The height of the output image.
   * If not specified, the natural height of the source image will be used.
   */
  height?: number;
  /**
   * Sets how the size of the image should be resized to the container
   * specified by the `width` and `height` options.
   * @default 'none'
   */
  resize?: 'none' | 'contain' | 'cover';
  /**
   * The quality of the output image.
   * It must be a number between `0` and `1`,
   * and only available for `image/jpeg` and `image/webp` images.
   * Check out {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob canvas.toBlob}.
   * @default 0.8
   */
  quality?: number;
  /**
   * The mime type of the output image.
   * By default, the original mime type of the source image file will be used.
   * @default 'auto'
   */
  mimeType?: string;
  /**
   * Files whose file type is included in this list,
   * and whose file size exceeds the `convertSize` value will be converted to JPEGs.
   * @default ['image/png']
   */
  convertTypes?: string[];
  /**
   * PNG files over this size (5 MB by default) will be converted to JPEGs.
   * To disable this, just set the value to `Infinity`.
   * @default 5000000
   */
  convertSize?: number;
  /**
   * The hook function to execute before draw the image into the canvas for compression.
   * @type {Function}
   * @param {CanvasRenderingContext2D} context - The 2d rendering context of the canvas.
   * @param {HTMLCanvasElement} canvas - The canvas for compression.
   * @example
   * function (context, canvas) {
   *   context.fillStyle = '#fff';
   * }
   */
  beforeDraw:
    | ((context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void)
    | null
    | undefined;
  /**
   * The hook function to execute after drew the image into the canvas for compression.
   * @param {CanvasRenderingContext2D} context - The 2d rendering context of the canvas.
   * @param {HTMLCanvasElement} canvas - The canvas for compression.
   * @example
   * function (context, canvas) {
   *   context.filter = 'grayscale(100%)';
   * }
   */
  drew: ((context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void) | null | undefined;
  /**
   * The hook function to execute when success to compress the image.
   * @param {File} file - The compressed image File object.
   * @example
   * function (file, canvas) {
   *   console.log(file);
   * }
   */
  success: ((file: File) => void) | null | undefined;
  /**
   * The hook function to execute when fail to compress the image.
   * @type {Function}
   * @param {Error} err - An Error object.
   * @example
   * function (err) {
   *   console.log(err.message);
   * }
   */
  error: ((error: Error) => void) | null | undefined;
}

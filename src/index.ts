import { defaultOptions } from './compressor-option';
import { toBlob } from './canvas-to-blob';
import {
  isBlob,
  arrayBufferToDataURL,
  getAdjustedSizes,
  isImageType,
  isPositiveNumber,
  normalizeDecimalNumber,
  parseOrientation,
  resetAndGetOrientation,
  getExif,
  insertExif,
  imageTypeToExtension,
  REGEXP_EXTENSION
} from './util';
import { WINDOW } from './constants';
import type { CompressorOptions } from './type';

const { ArrayBuffer, FileReader } = WINDOW;
const URL = WINDOW.URL || WINDOW.webkitURL;
const AnotherCompressor = WINDOW.Compressor;

export default class Compressor {
  file: File | Blob;
  options: CompressorOptions;
  image: HTMLImageElement;
  aborted: boolean;
  exif: any[];
  result: File | null;
  reader: FileReader | null;
  constructor(file: File | Blob, options?: CompressorOptions) {
    this.file = file;
    this.exif = [];
    this.image = new Image();
    this.options = {
      ...(defaultOptions as CompressorOptions),
      ...options
    };
    this.aborted = false;
    this.result = null;
    this.reader = null;
    this.init();
  }

  init() {
    const { file, options } = this;

    if (!isBlob(file)) {
      this.fail(new Error('The first argument must be a File or Blob object.'));
      return;
    }

    const mimeType = file.type;

    if (!isImageType(mimeType)) {
      this.fail(new Error('The first argument must be an image File or Blob object.'));
      return;
    }

    if (!URL || !FileReader) {
      this.fail(new Error('The current browser does not support image compression.'));
      return;
    }

    if (!ArrayBuffer) {
      options.checkOrientation = false;
      options.retainExif = false;
    }

    const isJPEGImage = mimeType === 'image/jpeg';
    const checkOrientation = isJPEGImage && options.checkOrientation;
    const retainExif = isJPEGImage && options.retainExif;

    if (URL && !checkOrientation && !retainExif) {
      this.load({
        url: URL.createObjectURL(file)
      });
    } else {
      const reader = new FileReader();

      this.reader = reader;
      reader.onload = ({ target }) => {
        const result = target?.result as ArrayBuffer;
        const data: any = {};
        let orientation = 1;

        if (checkOrientation) {
          // Reset the orientation value to its default value 1
          // as some iOS browsers will render image with its orientation
          orientation = resetAndGetOrientation(result) as number;

          if (orientation > 1) {
            Object.assign(data, parseOrientation(orientation));
          }
        }

        if (retainExif) {
          this.exif = getExif(result);
        }

        if (checkOrientation || retainExif) {
          if (
            !URL ||
            // Generate a new URL with the default orientation value 1.
            orientation > 1
          ) {
            data.url = arrayBufferToDataURL(result, mimeType);
          } else {
            data.url = URL.createObjectURL(file);
          }
        } else {
          data.url = result;
        }

        this.load(data);
      };
      reader.onabort = () => {
        this.fail(new Error('Aborted to read the image with FileReader.'));
      };
      reader.onerror = () => {
        this.fail(new Error('Failed to read the image with FileReader.'));
      };
      reader.onloadend = () => {
        this.reader = null;
      };

      if (checkOrientation || retainExif) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsDataURL(file);
      }
    }
  }

  load(data: any) {
    const { file, image } = this;

    image.onload = () => {
      this.draw({
        ...data,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight
      });
    };
    image.onabort = () => {
      this.fail(new Error('Aborted to load the image.'));
    };
    image.onerror = () => {
      this.fail(new Error('Failed to load the image.'));
    };

    // Match all browsers that use WebKit as the layout engine in iOS devices,
    // such as Safari for iOS, Chrome for iOS, and in-app browsers.
    if (
      WINDOW.navigator &&
      /(?:iPad|iPhone|iPod).*?AppleWebKit/i.test(WINDOW.navigator.userAgent)
    ) {
      // Fix the `The operation is insecure` error (#57)
      image.crossOrigin = 'anonymous';
    }

    image.alt = (file as File).name;
    image.src = data.url;
  }

  draw({
    naturalWidth,
    naturalHeight,
    rotate = 0,
    scaleX = 1,
    scaleY = 1
  }: {
    naturalWidth: number;
    naturalHeight: number;
    rotate: number;
    scaleX: number;
    scaleY: number;
  }) {
    const { file, image, options } = this;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const is90DegreesRotated = Math.abs(rotate) % 180 === 90;
    const optionWidth = options.width;
    const optionHeight = options.height;
    const resizable =
      (options.resize === 'contain' || options.resize === 'cover') &&
      isPositiveNumber(optionWidth) &&
      isPositiveNumber(optionHeight);
    let maxWidth = Math.max(options.maxWidth ?? defaultOptions.maxWidth, 0) || Infinity;
    let maxHeight = Math.max(options.maxHeight ?? defaultOptions.maxHeight, 0) || Infinity;
    let minWidth = Math.max(options.minWidth ?? defaultOptions.minWidth, 0) || 0;
    let minHeight = Math.max(options.minHeight ?? defaultOptions.minHeight, 0) || 0;
    let aspectRatio = naturalWidth / naturalHeight;
    let width = options.width;
    let height = options.height;

    if (is90DegreesRotated) {
      [maxWidth, maxHeight] = [maxHeight, maxWidth];
      [minWidth, minHeight] = [minHeight, minWidth];
      [width, height] = [height, width];
    }

    if (resizable) {
      aspectRatio = optionWidth / optionHeight;
    }

    ({ width: maxWidth = maxWidth, height: maxHeight = maxHeight } = getAdjustedSizes(
      {
        aspectRatio,
        width: maxWidth,
        height: maxHeight
      },
      'contain'
    ));
    ({ width: minWidth = minWidth, height: minHeight = minHeight } = getAdjustedSizes(
      {
        aspectRatio,
        width: minWidth,
        height: minHeight
      },
      'cover'
    ));

    let outputWidth: number;
    let outputHeight: number;

    if (resizable) {
      const sized = getAdjustedSizes(
        {
          aspectRatio,
          width: optionWidth,
          height: optionHeight
        },
        options.resize
      );

      outputWidth = sized.width ?? optionWidth;
      outputHeight = sized.height ?? optionHeight;
    } else {
      const sized = getAdjustedSizes({
        aspectRatio,
        width,
        height
      });

      outputWidth = sized.width ?? naturalWidth;
      outputHeight = sized.height ?? naturalHeight;
    }

    outputWidth = Math.floor(
      normalizeDecimalNumber(Math.min(Math.max(outputWidth, minWidth), maxWidth))
    );
    outputHeight = Math.floor(
      normalizeDecimalNumber(Math.min(Math.max(outputHeight, minHeight), maxHeight))
    );

    const destX = -outputWidth / 2;
    const destY = -outputHeight / 2;
    const destWidth = outputWidth;
    const destHeight = outputHeight;
    const params = [];

    if (resizable) {
      let srcX = 0;
      let srcY = 0;
      let srcWidth = naturalWidth;
      let srcHeight = naturalHeight;
      let _resize: CompressorOptions['resize'] = undefined;
      if (options.resize === 'contain') {
        _resize = 'cover';
      }
      if (options.resize === 'cover') {
        _resize = 'contain';
      }
      const srcSized = getAdjustedSizes(
        {
          aspectRatio,
          width: naturalWidth,
          height: naturalHeight
        },
        _resize
      );

      srcWidth = srcSized.width ?? naturalWidth;
      srcHeight = srcSized.height ?? naturalHeight;
      srcX = (naturalWidth - srcWidth) / 2;
      srcY = (naturalHeight - srcHeight) / 2;

      params.push(srcX, srcY, srcWidth, srcHeight);
    }

    params.push(destX, destY, destWidth, destHeight);

    if (is90DegreesRotated) {
      [outputWidth, outputHeight] = [outputHeight, outputWidth];
    }

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    if (!isImageType(options.mimeType ?? '')) {
      options.mimeType = file.type;
    }

    let fillStyle = 'transparent';

    // Converts PNG files over the `convertSize` to JPEGs.
    if (
      file.size > (options.convertSize ?? defaultOptions.convertSize) &&
      (options.convertTypes ?? defaultOptions.convertTypes).indexOf(
        options.mimeType ?? defaultOptions.mimeType
      ) >= 0
    ) {
      options.mimeType = 'image/jpeg';
    }

    const isJPEGImage = options.mimeType === 'image/jpeg';

    if (isJPEGImage) {
      fillStyle = '#fff';
    }

    // Override the default fill color (#000, black)
    if (context) {
      context.fillStyle = fillStyle;
      context.fillRect(0, 0, outputWidth, outputHeight);
    }

    if (options.beforeDraw && context) {
      options.beforeDraw.call(this, context, canvas);
    }

    if (this.aborted) {
      return;
    }

    if (context) {
      context.save();
      context.translate(outputWidth / 2, outputHeight / 2);
      context.rotate((rotate * Math.PI) / 180);
      context.scale(scaleX, scaleY);
      // @ts-ignore
      context.drawImage(image, ...params);
      context.restore();
    }

    if (options.drew && context) {
      options.drew.call(this, context, canvas);
    }

    if (this.aborted) {
      return;
    }

    const callback = (blob: Blob) => {
      if (!this.aborted) {
        const done = (result: File) =>
          this.done({
            naturalWidth,
            naturalHeight,
            result
          });

        if (blob && isJPEGImage && options.retainExif && this.exif && this.exif.length > 0) {
          const next = (arrayBuffer: ArrayBuffer) =>
            done(
              // @ts-ignore
              toBlob(arrayBufferToDataURL(insertExif(arrayBuffer, this.exif), options.mimeType))
            );

          if (blob.arrayBuffer) {
            blob
              .arrayBuffer()
              .then(next)
              .catch(() => {
                this.fail(
                  new Error('Failed to read the compressed image with Blob.arrayBuffer().')
                );
              });
          } else {
            const reader = new FileReader();

            this.reader = reader;
            reader.onload = ({ target }) => {
              next(target?.result as ArrayBuffer);
            };
            reader.onabort = () => {
              this.fail(new Error('Aborted to read the compressed image with FileReader.'));
            };
            reader.onerror = () => {
              this.fail(new Error('Failed to read the compressed image with FileReader.'));
            };
            reader.onloadend = () => {
              this.reader = null;
            };
            reader.readAsArrayBuffer(blob);
          }
        } else {
          done(blob as File);
        }
      }
    };

    if (canvas.toBlob) {
      canvas.toBlob(callback as BlobCallback, options.mimeType, options.quality);
    } else {
      // @ts-ignore
      callback(toBlob(canvas.toDataURL(options.mimeType, options.quality)));
    }
  }

  toOutputFile(blob: Blob): File {
    const { file, options } = this;
    const sourceName = file instanceof File ? file.name : 'blob';
    let fileName = sourceName;

    if (blob.type && blob.type !== file.type) {
      fileName = sourceName.replace(REGEXP_EXTENSION, imageTypeToExtension(blob.type));
    }

    return new File([blob], fileName, {
      type: blob.type || options.mimeType || file.type,
      lastModified: Date.now()
    });
  }

  toResultFile(blob: File | Blob): File {
    return blob instanceof File ? blob : this.toOutputFile(blob);
  }

  done({
    naturalWidth,
    naturalHeight,
    result: initialResult
  }: {
    naturalWidth: number;
    naturalHeight: number;
    result: File | Blob | null;
  }) {
    const { file, image, options } = this;
    let result: File;

    if (URL && image.src.indexOf('blob:') === 0) {
      URL.revokeObjectURL(image.src);
    }

    if (initialResult) {
      if (
        options.strict &&
        !options.retainExif &&
        initialResult.size > file.size &&
        options.mimeType === file.type &&
        !(
          (options.width ?? 0) > naturalWidth ||
          (options.height ?? 0) > naturalHeight ||
          (options.minWidth ?? 0) > naturalWidth ||
          (options.minHeight ?? 0) > naturalHeight ||
          (options.maxWidth ?? Infinity) < naturalWidth ||
          (options.maxHeight ?? Infinity) < naturalHeight
        )
      ) {
        result = this.toResultFile(file);
      } else {
        result = this.toOutputFile(initialResult);
      }
    } else {
      result = this.toResultFile(file);
    }

    this.result = result;

    if (options.success) {
      options.success.call(this, result);
    }
  }

  fail(err: Error) {
    const { options } = this;

    if (options.error) {
      options.error.call(this, err);
    } else {
      throw err;
    }
  }

  abort() {
    if (!this.aborted) {
      this.aborted = true;

      if (this.reader) {
        this.reader.abort();
      } else if (!this.image.complete) {
        this.image.onload = null;
        if (this.image.onabort) {
          this.image.onabort(new UIEvent('abort'));
        }
      } else {
        this.fail(new Error('The compression process has been aborted.'));
      }
    }
  }

  static noConflict() {
    window.Compressor = AnotherCompressor;
    return Compressor;
  }

  static setDefaults(options: CompressorOptions) {
    Object.assign(defaultOptions, options);
  }
}

export type { CompressorOptions };

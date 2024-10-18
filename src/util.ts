import { WINDOW } from './constants';
import type { CompressorOptions } from './type';

export function isBlob(value: unknown): boolean {
  if (typeof Blob === 'undefined') {
    return false;
  }
  return value instanceof Blob || Object.prototype.toString.call(value) === '[object Blob]';
}

export const isPositiveNumber = (value: number) => value > 0 && value < Infinity;

const { slice } = Array.prototype;

export function toArray(value: any) {
  return Array.from ? Array.from(value) : slice.call(value);
}

const REGEXP_IMAGE_TYPE = /^image\/.+$/;

export function isImageType(value: string) {
  return REGEXP_IMAGE_TYPE.test(value);
}

export function imageTypeToExtension(value: string) {
  let extension = isImageType(value) ? value.slice(6) : '';

  if (extension === 'jpeg') {
    extension = 'jpg';
  }

  return `.${extension}`;
}

const { fromCharCode } = String;

export function getStringFromCharCode(dataView: DataView, start: number, length: number) {
  let str = '';
  let i;

  length += start;

  for (i = start; i < length; i += 1) {
    str += fromCharCode(dataView.getUint8(i));
  }

  return str;
}

const { btoa } = WINDOW;

export function arrayBufferToDataURL(arrayBuffer: ArrayBuffer, mimeType: string) {
  const chunks = [];
  const chunkSize = 8192;
  let uint8 = new Uint8Array(arrayBuffer);

  while (uint8.length > 0) {
    // XXX: Babel's `toConsumableArray` helper will throw error in IE or Safari 9
    // eslint-disable-next-line prefer-spread
    chunks.push(fromCharCode.apply(null, toArray(uint8.subarray(0, chunkSize))));
    uint8 = uint8.subarray(chunkSize);
  }

  return `data:${mimeType};base64,${btoa(chunks.join(''))}`;
}

export function resetAndGetOrientation(
  arrayBuffer: ArrayBufferLike & {
    BYTES_PER_ELEMENT?: never;
  }
) {
  const dataView = new DataView(arrayBuffer);
  let orientation;

  // Ignores range error when the image does not have correct Exif information
  try {
    let littleEndian;
    let app1Start;
    let ifdStart;

    // Only handle JPEG image (start by 0xFFD8)
    if (dataView.getUint8(0) === 0xff && dataView.getUint8(1) === 0xd8) {
      const length = dataView.byteLength;
      let offset = 2;

      while (offset + 1 < length) {
        if (dataView.getUint8(offset) === 0xff && dataView.getUint8(offset + 1) === 0xe1) {
          app1Start = offset;
          break;
        }

        offset += 1;
      }
    }

    if (app1Start) {
      const exifIDCode = app1Start + 4;
      const tiffOffset = app1Start + 10;

      if (getStringFromCharCode(dataView, exifIDCode, 4) === 'Exif') {
        const endianness = dataView.getUint16(tiffOffset);

        littleEndian = endianness === 0x4949;

        if (littleEndian || endianness === 0x4d4d /* bigEndian */) {
          if (dataView.getUint16(tiffOffset + 2, littleEndian) === 0x002a) {
            const firstIFDOffset = dataView.getUint32(tiffOffset + 4, littleEndian);

            if (firstIFDOffset >= 0x00000008) {
              ifdStart = tiffOffset + firstIFDOffset;
            }
          }
        }
      }
    }

    if (ifdStart) {
      const length = dataView.getUint16(ifdStart, littleEndian);
      let offset;
      let i;

      for (i = 0; i < length; i += 1) {
        offset = ifdStart + i * 12 + 2;

        if (dataView.getUint16(offset, littleEndian) === 0x0112 /* Orientation */) {
          // 8 is the offset of the current tag's value
          offset += 8;

          // Get the original orientation value
          orientation = dataView.getUint16(offset, littleEndian);

          // Override the orientation with its default value
          dataView.setUint16(offset, 1, littleEndian);
          break;
        }
      }
    }
  } catch (e) {
    orientation = 1;
  }

  return orientation;
}

export function parseOrientation(orientation: number) {
  let rotate = 0;
  let scaleX = 1;
  let scaleY = 1;

  switch (orientation) {
    // Flip horizontal
    case 2:
      scaleX = -1;
      break;

    // Rotate left 180°
    case 3:
      rotate = -180;
      break;

    // Flip vertical
    case 4:
      scaleY = -1;
      break;

    // Flip vertical and rotate right 90°
    case 5:
      rotate = 90;
      scaleY = -1;
      break;

    // Rotate right 90°
    case 6:
      rotate = 90;
      break;

    // Flip horizontal and rotate right 90°
    case 7:
      rotate = 90;
      scaleX = -1;
      break;

    // Rotate left 90°
    case 8:
      rotate = -90;
      break;

    default:
  }

  return {
    rotate,
    scaleX,
    scaleY
  };
}

const REGEXP_DECIMALS = /\.\d*(?:0|9){12}\d*$/;

export function normalizeDecimalNumber(value: number, times = 100000000000) {
  return REGEXP_DECIMALS.test(value.toString()) ? Math.round(value * times) / times : value;
}

export function getAdjustedSizes(
  {
    aspectRatio,
    height,
    width
  }: {
    aspectRatio: number;
    height: number;
    width: number;
  },

  type: CompressorOptions['resize'] = 'none'
) {
  const isValidWidth = isPositiveNumber(width);
  const isValidHeight = isPositiveNumber(height);

  if (isValidWidth && isValidHeight) {
    const adjustedWidth = height * aspectRatio;

    if (
      ((type === 'contain' || type === 'none') && adjustedWidth > width) ||
      (type === 'cover' && adjustedWidth < width)
    ) {
      height = width / aspectRatio;
    } else {
      width = height * aspectRatio;
    }
  } else if (isValidWidth) {
    height = width / aspectRatio;
  } else if (isValidHeight) {
    width = height * aspectRatio;
  }

  return {
    width,
    height
  };
}

export function getExif(arrayBuffer: ArrayBuffer) {
  const array = toArray(new Uint8Array(arrayBuffer));
  const { length } = array;
  const segments = [];
  let start = 0;

  while (start + 3 < length) {
    const value = array[start];
    const next = array[start + 1];

    // SOS (Start of Scan)
    if (value === 0xff && next === 0xda) {
      break;
    }

    // SOI (Start of Image)
    if (value === 0xff && next === 0xd8) {
      start += 2;
    } else {
      const offset = array[start + 2] * 256 + array[start + 3];
      const end = start + offset + 2;
      const segment = array.slice(start, end);

      segments.push(segment);
      start = end;
    }
  }

  return segments.reduce((exifArray, current) => {
    if (current[0] === 0xff && current[1] === 0xe1) {
      return exifArray.concat(current);
    }

    return exifArray;
  }, []);
}

export function insertExif(arrayBuffer: ArrayBuffer, exifArray: any[]) {
  const array = toArray(new Uint8Array(arrayBuffer));

  if (array[2] !== 0xff || array[3] !== 0xe0) {
    return arrayBuffer;
  }

  const app0Length = array[4] * 256 + array[5];
  const newArrayBuffer = [0xff, 0xd8].concat(exifArray, array.slice(4 + app0Length));

  return new Uint8Array(newArrayBuffer);
}

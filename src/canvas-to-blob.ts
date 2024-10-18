const CanvasPrototype = window.HTMLCanvasElement && window.HTMLCanvasElement.prototype;
const hasBlobConstructor =
  window.Blob &&
  (function () {
    try {
      return Boolean(new Blob());
    } catch (e) {
      return false;
    }
  })();
const hasArrayBufferViewSupport =
  hasBlobConstructor &&
  window.Uint8Array &&
  (function () {
    try {
      return new Blob([new Uint8Array(100)]).size === 100;
    } catch (e) {
      return false;
    }
  })();
const BlobBuilder =
  window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
const dataURIPattern = /^data:((.*?)(;charset=.*?)?)(;base64)?,/;
const dataURLtoBlob =
  (hasBlobConstructor || BlobBuilder) &&
  window.atob !== undefined &&
  window.ArrayBuffer &&
  window.Uint8Array &&
  function (dataURI: string) {
    let matches: RegExpMatchArray | null = null;
    let mediaType = '';
    let isBase64 = false;
    let dataString = '';
    let byteString = '';
    let arrayBuffer: ArrayBuffer;
    let intArray: Uint8Array;
    let i: any;
    let bb: any;
    // Parse the dataURI components as per RFC 2397
    matches = dataURI.match(dataURIPattern);
    if (!matches) {
      throw new Error('invalid data URI');
    }
    // Default to text/plain;charset=US-ASCII
    mediaType = matches[2] ? matches[1] : 'text/plain' + (matches[3] || ';charset=US-ASCII');
    isBase64 = !!matches[4];
    dataString = dataURI.slice(matches[0].length);
    if (isBase64) {
      // Convert base64 to raw binary data held in a string:
      byteString = atob(dataString);
    } else {
      // Convert base64/URLEncoded data component to raw binary:
      byteString = decodeURIComponent(dataString);
    }
    // Write the bytes of the string to an ArrayBuffer:
    arrayBuffer = new ArrayBuffer(byteString.length);
    intArray = new Uint8Array(arrayBuffer);
    for (i = 0; i < byteString.length; i += 1) {
      intArray[i] = byteString.charCodeAt(i);
    }
    // Write the ArrayBuffer (or ArrayBufferView) to a blob:
    if (hasBlobConstructor) {
      return new Blob([hasArrayBufferViewSupport ? intArray : arrayBuffer], {
        type: mediaType
      });
    }
    bb = new BlobBuilder();
    bb.append(arrayBuffer);
    return bb.getBlob(mediaType);
  };
if (window.HTMLCanvasElement && !CanvasPrototype.toBlob) {
  if (CanvasPrototype.mozGetAsFile) {
    CanvasPrototype.toBlob = function (callback, type, quality) {
      var self = this;
      setTimeout(function () {
        if (quality && CanvasPrototype.toDataURL !== undefined && dataURLtoBlob) {
          callback(dataURLtoBlob(self.toDataURL(type, quality)));
        } else {
          callback(self.mozGetAsFile('blob', type));
        }
      });
    };
  } else if (CanvasPrototype.toDataURL && dataURLtoBlob) {
    if (CanvasPrototype.msToBlob) {
      CanvasPrototype.toBlob = function (callback, type, quality) {
        var self = this;
        setTimeout(function () {
          if (
            ((type && type !== 'image/png') || quality) &&
            CanvasPrototype.toDataURL !== undefined &&
            dataURLtoBlob
          ) {
            callback(dataURLtoBlob(self.toDataURL(type, quality)));
          } else {
            callback(self.msToBlob(type));
          }
        });
      };
    } else {
      CanvasPrototype.toBlob = function (callback, type, quality) {
        var self = this;
        setTimeout(function () {
          callback(dataURLtoBlob(self.toDataURL(type, quality)));
        });
      };
    }
  }
}

const toBlob = CanvasPrototype.toBlob;

export { dataURLtoBlob, toBlob, CanvasPrototype };

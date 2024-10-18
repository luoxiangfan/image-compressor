declare global {
  interface Window {
    BlobBuilder: any;
    WebKitBlobBuilder: any;
    MozBlobBuilder: any;
    MSBlobBuilder: any;
    Compressor: any;
  }
  interface HTMLCanvasElement {
    mozGetAsFile: any;
    msToBlob: any;
  }
  const define: any;
}

export {};

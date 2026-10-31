// Read dimensions before the browser allocates decoded texture memory.
export function imageMemory(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0,
    height = 0;
  if (
    bytes.length >= 24 &&
    v.getUint32(0) === 0x89504e47 &&
    v.getUint32(4) === 0x0d0a1a0a
  ) {
    width = v.getUint32(16);
    height = v.getUint32(20);
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset++] !== 0xff) continue;
      let marker = bytes[offset++];
      while (marker === 0xff) marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      const length = v.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      ) {
        height = v.getUint16(offset + 3);
        width = v.getUint16(offset + 5);
        break;
      }
      offset += length;
    }
  }
  if (!width || !height || width > 16384 || height > 16384)
    throw Error("RESOURCE_TOO_LARGE: неподдерживаемые размеры текстуры");
  return Math.ceil(width * height * 4 * 2 * 1.34);
}
export function embeddedBytes(uri) {
  const comma = uri.indexOf(",");
  if (comma < 0 || !uri.slice(0, comma).endsWith(";base64"))
    throw Error("INVALID_REQUEST: texture data URI");
  const decoded = atob(uri.slice(comma + 1));
  return Uint8Array.from(decoded, (c) => c.charCodeAt(0));
}

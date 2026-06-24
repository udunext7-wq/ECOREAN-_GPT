const fs = require('fs');
const zlib = require('zlib');

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePng(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error('PNG_SIGNATURE_INVALID');
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += length + 12;
  }
  if (bitDepth !== 8 || ![2, 6].includes(colorType)) throw new Error('PNG_FORMAT_UNSUPPORTED');
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(height * stride);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[sourceOffset++];
    const rowStart = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[sourceOffset++];
      const left = x >= channels ? pixels[rowStart + x - channels] : 0;
      const up = y > 0 ? pixels[rowStart - stride + x] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[rowStart - stride + x - channels] : 0;
      let decoded = value;
      if (filter === 1) decoded = (value + left) & 255;
      else if (filter === 2) decoded = (value + up) & 255;
      else if (filter === 3) decoded = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) decoded = (value + paeth(left, up, upLeft)) & 255;
      pixels[rowStart + x] = decoded;
    }
  }
  return { width, height, channels, pixels };
}

function pixelDifference(firstPath, secondPath) {
  const first = decodePng(firstPath);
  const second = decodePng(secondPath);
  if (first.width !== second.width || first.height !== second.height || first.channels !== second.channels) {
    return { status: 'FAILED', reason: 'DIMENSION_MISMATCH' };
  }
  let changed = 0;
  let totalDelta = 0;
  const pixelCount = first.width * first.height;
  for (let index = 0; index < first.pixels.length; index += first.channels) {
    let delta = 0;
    for (let channel = 0; channel < 3; channel += 1) {
      delta += Math.abs(first.pixels[index + channel] - second.pixels[index + channel]);
    }
    if (delta > 18) changed += 1;
    totalDelta += delta;
  }
  return {
    status: 'PASSED',
    width: first.width,
    height: first.height,
    changed_pixel_ratio: changed / pixelCount,
    mean_rgb_delta: totalDelta / (pixelCount * 3)
  };
}

function inspectLayoutSnapshot(snapshot) {
  const viewport = snapshot.viewport || {};
  const overflowing = (snapshot.elements || []).filter((element) => (
    element.right > viewport.width + 2 ||
    element.left < -2 ||
    element.width < 1 ||
    element.height < 1
  ));
  return {
    status: overflowing.length === 0 ? 'PASSED' : 'FAILED',
    viewport,
    overflowing
  };
}

module.exports = {
  decodePng,
  pixelDifference,
  inspectLayoutSnapshot
};

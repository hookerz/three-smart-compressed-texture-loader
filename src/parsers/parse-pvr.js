// Adapted from https://github.com/mrdoob/three.js/blob/dev/examples/js/loaders/PVRLoader.js

import { CompressedTexture, RGB_PVRTC_2BPPV1_Format, RGBA_PVRTC_2BPPV1_Format, RGB_PVRTC_4BPPV1_Format, RGBA_PVRTC_4BPPV1_Format } from 'three';

/**
 * 
 * @param {Buffer} buffer
 * @param {Boolean} loadMipmaps
 * @returns {THREE.CompressedTexture}
 */
export function parse(buffer, loadMipmaps) {

  // Parse the header.
  const meta = parseHeader(buffer);
  
  // Decompose the header.
  const { bpp, format, width, height, isCubemap } = meta;
  const mipmapCount = loadMipmaps ? meta.mipmapCount : 1;
  
  // Derive the number of bytes per image block in the buffer.
  const blockWidth  = (bpp === 2) ? 8 : 4;
  const blockHeight = (bpp === 2) ? 4 : 4;
  const blockBytes  = (blockWidth * blockHeight) * bpp / 8;

  // A list of images in the texture. Usually one, but cubemaps have six.
  const images = [];

  // A mutable offset that we'll use to step through the file buffer.
  let dataOffset = meta.dataOffset;

  // Extract each face of the texture, and each mipmap of each face, from the
  // buffer. Build an image object for each one and insert it into the list.
  for (let i = 0, n = (isCubemap ? 6 : 1); i < n; i++) {

    const image = { width, height, format, mipmaps: [] };

    let mipWidth  = width;
    let mipHeight = height;
    
    for (let j = 0; j < mipmapCount; j++) {

      const dataWidth  = Math.max(mipWidth / blockWidth, 2);
      const dataHeight = Math.max(mipHeight / blockHeight, 2);
      const dataLength = dataWidth * dataHeight * blockBytes;
      
      const data = new Uint8Array(buffer, dataOffset, dataLength);

      // Push the mipmap into the texture.
      image.mipmaps.push({ data, width: mipWidth, height: mipHeight });

      // Each mipmap is smaller by a power of 2.
      mipWidth = Math.max(mipWidth >> 1, 1);
      mipHeight = Math.max(mipHeight >> 1, 1);

      // Offset the start of the next data view.
      dataOffset += data.byteLength;

    }
    
    images.push(image);
    
  }

  const pvr = new CompressedTexture();

  pvr.format = format;
  pvr.isCubemap = isCubemap;
  
  if (isCubemap) {

    pvr.mipmaps = null;
    pvr.image = images;

  } else {

    pvr.mipmaps = images[0].mipmaps;
    pvr.image = images[0];
    
  }
  
  return pvr;

}

const PVR_V3 = 0x03525650;
const PVR_V2 = 0x21525650;

function parseHeader(buffer) {
  
  const header = new Uint32Array(buffer, 0, 13);

  if (header[0] === PVR_V3) {

    return parseHeaderV3(header);

  } else if (header[11] === PVR_V2) {

    return parseHeaderV2(header);

  } else {

    throw new Error('Unknown PVR version');

  }
  
}

function parseHeaderV3(header) {

  const formatFlag  = header[2];
  const height      = header[6];
  const width       = header[7];
  const faceCount   = header[10];
  const mipmapCount = header[11];
  const dataOffset  = header[12];

  let bpp, format;

  switch (formatFlag) {
    
    case 0:
      format = RGB_PVRTC_2BPPV1_Format;
      bpp = 2;
      break;
    
    case 1:
      format = RGBA_PVRTC_2BPPV1_Format;
      bpp = 2;
      break;
    
    case 2:
      format = RGB_PVRTC_4BPPV1_Format;
      bpp = 4;
      break;
    
    case 3:
      format = RGBA_PVRTC_4BPPV1_Format;
      bpp = 4;
      break;
    
    default :
      throw new Error('Unknown PVR pixel format ' + formatFlag);
      
  }
  
  const isCubemap = faceCount === 6;
  
  // The raw data offset is off.
  const correctedDataOffset = dataOffset + 52;
  
  return { bpp, format, width, height, isCubemap, mipmapCount, dataOffset: correctedDataOffset };

}

function parseHeaderV2(header) {

  const dataOffset  = header[0];
  const height      = header[1];
  const width       = header[2];
  const mipmapCount = header[3];
  const formatFlag  = header[4];
  const alphaFlag   = header[10];
  const faceCount   = header[12];

  let bpp, format;
 
  switch (formatFlag) {
    
    case 24:
      format = (alphaFlag > 0) ? THREE.RGBA_PVRTC_4BPPV1_Format : THREE.RGB_PVRTC_4BPPV1_Format;
      bpp = 4;
      break;
    
    case 25:
      format = (alphaFlag > 0) ? THREE.RGBA_PVRTC_2BPPV1_Format : THREE.RGB_PVRTC_2BPPV1_Format;
      bpp = 2;
      break;
    
    default:
      throw new Error('Unknown PVR pixel format ' + formatFlag);
      
  }

  const isCubemap = faceCount === 6;

  // The raw mipmap count is off by one.
  const correctedMipmapCount = mipmapCount + 1;
  
  return { bpp, format, width, height, isCubemap, mipmapCount: correctedMipmapCount, dataOffset };

}

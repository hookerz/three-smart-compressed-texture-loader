// Adapted from https://github.com/toji/texture-tester/blob/master/js/webgl-texture-util.js

import { CompressedTexture, RGB_ATC_Format, RGBA_ATC_EXPLICIT_Format, RGBA_ATC_INTERPOLATED_Format, RGB_S3TC_DXT1_Format, RGBA_S3TC_DXT3_Format, RGBA_S3TC_DXT5_Format, RGB_ETC1_Format, RGBAFormat } from 'three';

// Translate four chars to an integer.
const fourCCToInt32 = value =>
  (value.charCodeAt(0) <<  0) +
  (value.charCodeAt(1) <<  8) +
  (value.charCodeAt(2) << 16) +
  (value.charCodeAt(3) << 24);

// Translate an integer to four chars.
const int32ToFourCC = value =>
  String.fromCharCode(
    (value >>  0) & 0xff,
    (value >>  8) & 0xff,
    (value >> 16) & 0xff,
    (value >> 24) & 0xff
  );

// The magic number used to verify the DDS format.
const DDS_MAGIC = 0x20534444;

// Header Flags
const DDS_FLAG_CAPS        = 0x1;
const DDS_FLAG_HEIGHT      = 0x2;
const DDS_FLAG_WIDTH       = 0x4;
const DDS_FLAG_PITCH       = 0x8;
const DDS_FLAG_PIXELFORMAT = 0x1000;
const DDS_FLAG_MIPCOUNT    = 0x20000;

// Pixel Format Flags
const DDS_PF_FLAG_FOURCC  = 0x4;

// Surface Flags
const DDS_CAPS_FLAG_CUBEMAP           = 0x200;
const DDS_CAPS_FLAG_CUBEMAP_POSITIVEX = 0x400;
const DDS_CAPS_FLAG_CUBEMAP_NEGATIVEX = 0x800;
const DDS_CAPS_FLAG_CUBEMAP_POSITIVEY = 0x1000;
const DDS_CAPS_FLAG_CUBEMAP_NEGATIVEY = 0x2000;
const DDS_CAPS_FLAG_CUBEMAP_POSITIVEZ = 0x4000;
const DDS_CAPS_FLAG_CUBEMAP_NEGATIVEZ = 0x8000;

// FourCC Integer Constants
const FOURCC_DXT1 = fourCCToInt32('DXT1');
const FOURCC_DXT3 = fourCCToInt32('DXT3');
const FOURCC_DXT5 = fourCCToInt32('DXT5');
const FOURCC_ETC1 = fourCCToInt32('ETC1');
const FOURCC_ATC  = fourCCToInt32('ATC ');
const FOURCC_ATCA = fourCCToInt32('ATCA');
const FOURCC_ATCI = fourCCToInt32('ATCI');

/**
 * Parse a DDS buffer.
 * @param {TypedArray} buffer
 * @param {Boolean} loadMipmaps
 */
export function parse(buffer, loadMipmaps) {

  // Parse the header.
  const meta = parseHeader(buffer);

  // Decompose the header.
  const { format, width, height, isCubemap, blockBytes } = meta;
  const mipmapCount = loadMipmaps ? meta.mipmapCount : 1;

  // A list of images in the texture. Usually one, but cubemaps have six.
  const images = [];

  // A mutable offset that we'll use to step through the file buffer.
  let dataOffset = meta.dataOffset;

  // Extract each face of the texture, and each mipmap of each face, from the
  // buffer. Build an image object for each one and insert it into the list.
  for (let i = 0, n = (isCubemap ? 6 : 1); i < n; i++) {

    const image = { width, height, format, mipmaps: [] }; 
    
    let mipWidth = width;
    let mipHeight = height;
    
    for (let j = 0; j < mipmapCount; j++) {

      let data;
      
      if (format === RGBAFormat) {

        data = loadRGBAMipmap(buffer, dataOffset, mipWidth, mipHeight);
        
      } else {
        
        const dataWidth  = Math.max(mipWidth / 4, 1);
        const dataHeight = Math.max(mipHeight / 4, 1);
        const dataLength = dataWidth * dataHeight * blockBytes;
        
        data = new Uint8Array(buffer, dataOffset, dataLength);

      }

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
  
  const dds = new CompressedTexture();
  
  dds.format = format;
  dds.isCubemap = isCubemap;
  
  if (isCubemap) {
    
    dds.mipmaps = null;
    dds.image = images;
    
  } else {
    
    dds.mipmaps = images[0].mipmaps;
    dds.image.width = images[0].width;
    dds.image.height = images[0].height;
    
  }

  return dds;

}

/**
 * 
 * Notes:
 * 
 * - The example DDS parser used by three.js checks the DDSD_MIPMAPCOUNT flag,
 *   but according to https://msdn.microsoft.com/en-us/library/windows/desktop/bb943982(v=vs.85).aspx
 *   that shouldn't be read. We're using the mipmapCount directly from the header.
 * 
 * @param buffer
 * @returns {{format: *, width: *, height: *, faceCount: number, blockBytes: *, dataOffset: number, mipmapCount: *}}
 */
function parseHeader(buffer) {

  const header = new Int32Array(buffer, 0, 32);

  const magic                  = header[0];
  const size                   = header[1];
  const flags                  = header[2];
  const height                 = header[3];
  const width                  = header[4];
  const pitch                  = header[5];
  const depth                  = header[6];
  const mipmapCount            = header[7];
  // Words 8-19 are reserved.
  const pixelFormatFlags       = header[20];
  const pixelFormatFourCC      = header[21];
  const pixelFormatRGBBitcount = header[22];
  const pixelFormatRMask       = header[23];
  const pixelFormatGMask       = header[24];
  const pixelFormatBMask       = header[25];
  const pixelFormatAMask       = header[26];
  const caps1Flags             = header[27];
  const caps2Flags             = header[28];
  const caps3Flags             = header[29];
  const caps4Flags             = header[30];
  // Word 31 is reserved.

  // Check if the buffer is a DDS file.
  if (magic !== DDS_MAGIC) {

    throw new Error('Invalid magic number in DDS header');

  }  else if (pixelFormatFlags & DDS_PF_FLAG_FOURCC === 0) {

    throw new Error('Unsupported format, must contain a FourCC code');

  }

  let format, blockBytes;

  switch (pixelFormatFourCC) {

    case FOURCC_DXT1:
      format = RGB_S3TC_DXT1_Format;
      blockBytes = 8;
      break;

    case FOURCC_DXT3:
      format = RGBA_S3TC_DXT3_Format;
      blockBytes = 16;
      break;

    case FOURCC_DXT5:
      format = RGBA_S3TC_DXT5_Format;
      blockBytes = 16;
      break;

    case FOURCC_ETC1:
      format = RGB_ETC1_Format;
      blockBytes = 8;
      break;
    
    case FOURCC_ATC:
      format = RGB_ATC_Format;
      blockBytes = 8;
      break;
    
    case FOURCC_ATCI:
      format = RGBA_ATC_INTERPOLATED_Format;
      blockBytes = 16;
      break;
    
    case FOURCC_ATCA:
      format = RGBA_ATC_EXPLICIT_Format;
      blockBytes = 16;
      break;
    
    default:
      
      if (pixelFormatRGBBitcount === 32 &&
          pixelFormatAMask & 0xff000000 &&
          pixelFormatRMask & 0x00ff0000 &&
          pixelFormatGMask & 0x0000ff00 &&
          pixelFormatBMask & 0x000000ff) {

        format = RGBAFormat;
        blockBytes = 64;

      } else throw new Error('Unsupported FourCC code ', int32ToFourCC(pixelFormatFourCC));

  }
 
  const dataOffset = header.byteLength;
  
  // Make sure the mipmap count is a number.
  const correctedMipmapCount = Math.max(1, mipmapCount);
  
  // Check if the texture is a cubemap.
  const isCubemap = (caps2Flags & DDS_CAPS_FLAG_CUBEMAP) ? true : false;

  // Check if the texture is missing any cubemap faces.
  if (isCubemap && !(caps2Flags & DDS_CAPS_FLAG_CUBEMAP_POSITIVEX) &&
                   !(caps2Flags & DDS_CAPS_FLAG_CUBEMAP_NEGATIVEX) &&
                   !(caps2Flags & DDS_CAPS_FLAG_CUBEMAP_POSITIVEY) &&
                   !(caps2Flags & DDS_CAPS_FLAG_CUBEMAP_NEGATIVEY) &&
                   !(caps2Flags & DDS_CAPS_FLAG_CUBEMAP_POSITIVEZ) &&
                   !(caps2Flags & DDS_CAPS_FLAG_CUBEMAP_NEGATIVEZ)) {

    throw new Error('Incomplete cubemap faces');

  }
  
  return { format, width, height, isCubemap, blockBytes, dataOffset, mipmapCount: correctedMipmapCount };

}

/**
 * Read an uncompressed RGBA mipmap from the buffer.
 * @returns {Uint8Array}
 */
function loadRGBAMipmap(buffer, dataOffset, width, height) {

  const dataLength = width * height * 4;
  const dataBuffer = new Uint8Array(buffer, dataOffset, dataLength);
  const rgbaBuffer = new Uint8Array(dataLength);

  let index = 0;

  for (let x = 0; x < width; x++) {

    for (let y = 0; y < height; y++) {

      // Read the RGBA bytes from the source buffer.
      const b = dataBuffer[index + 0];
      const g = dataBuffer[index + 1];
      const r = dataBuffer[index + 2];
      const a = dataBuffer[index + 3];

      // Write the RGBA bytes into the result buffer in a different order.
      rgbaBuffer[index + 0] = r;
      rgbaBuffer[index + 1] = g;
      rgbaBuffer[index + 2] = b;
      rgbaBuffer[index + 3] = a;

      // Jump to the next block.
      index = index + 4;

    }

  }

  return rgbaBuffer;

}

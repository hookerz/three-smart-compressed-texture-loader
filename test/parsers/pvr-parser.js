import fs from 'fs';
import path from 'path';
import test from 'tape';
import three from 'three';

import * as PVRParser from '../../src/parsers/parse-pvr';

const { RGB_PVRTC_2BPPV1_Format, RGBA_PVRTC_2BPPV1_Format, RGB_PVRTC_4BPPV1_Format, RGBA_PVRTC_4BPPV1_Format } = three;

function readFixture(filename) {
  
  const filepath = path.resolve(__dirname, '../fixtures', filename);
  const buffer = fs.readFileSync(filepath);
  
  // Return the ES5 TypedArray, not the node.js Buffer.
  return buffer.buffer;
  
}

test(function(assert) {
  
  const buffer = readFixture('shannon-pvrtc-2bpp-rgb.pvr');
  const pvr = PVRParser.parse(buffer, true);

  assert.equal(pvr.image.width, 512);
  assert.equal(pvr.image.height, 512);
  assert.equal(pvr.image.format, RGB_PVRTC_2BPPV1_Format);
  assert.equal(pvr.mipmaps.length, 10);
  assert.equal(pvr.isCubemap, false);
  
  assert.end();
  
});

test(function(assert) {
  
  const buffer = readFixture('shannon-pvrtc-2bpp-rgba.pvr');
  const pvr = PVRParser.parse(buffer, true);

  assert.equal(pvr.image.width, 512);
  assert.equal(pvr.image.height, 512);
  assert.equal(pvr.image.format, RGBA_PVRTC_2BPPV1_Format);
  assert.equal(pvr.mipmaps.length, 10);
  assert.equal(pvr.isCubemap, false);

  assert.end();

});

test(function(assert) {

  const buffer = readFixture('shannon-pvrtc-4bpp-rgb.pvr');
  const pvr = PVRParser.parse(buffer, true);

  assert.equal(pvr.image.width, 512);
  assert.equal(pvr.image.height, 512);
  assert.equal(pvr.image.format, RGB_PVRTC_4BPPV1_Format);
  assert.equal(pvr.mipmaps.length, 10);
  assert.equal(pvr.isCubemap, false);

  assert.end();

});

test(function(assert) {

  const buffer = readFixture('shannon-pvrtc-4bpp-rgba.pvr');
  const pvr = PVRParser.parse(buffer, true);

  assert.equal(pvr.image.width, 512);
  assert.equal(pvr.image.height, 512);
  assert.equal(pvr.image.format, RGBA_PVRTC_4BPPV1_Format);
  assert.equal(pvr.mipmaps.length, 10);
  assert.equal(pvr.isCubemap, false);

  assert.end();

});

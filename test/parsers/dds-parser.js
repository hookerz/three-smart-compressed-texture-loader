import fs from 'fs';
import path from 'path';
import test from 'tape';
import three from 'three';

import * as DDSParser from '../../src/parsers/parse-dds';

const { RGB_S3TC_DXT1_Format, RGBA_S3TC_DXT3_Format, RGBA_S3TC_DXT5_Format, RGB_ETC1_Format, RGBAFormat } = three;

function readFixture(filename) {
  
  const filepath = path.resolve(__dirname, '../fixtures', filename);
  const buffer = fs.readFileSync(filepath);
  
  // Return the ES5 TypedArray, not the node.js Buffer.
  return buffer.buffer;
  
}

test(function(assert) {
  
  const buffer = readFixture('shannon-dxt1.dds');
  const dds = DDSParser.parse(buffer, true);
  
  assert.equal(dds.image.width, 512);
  assert.equal(dds.image.height, 512);
  assert.equal(dds.image.format, RGB_S3TC_DXT1_Format);
  assert.equal(dds.mipmaps.length, 10);
  assert.equal(dds.isCubemap, false);
  
  assert.end();
  
});

test(function(assert) {
  
  const buffer = readFixture('shannon-dxt3.dds');
  const dds = DDSParser.parse(buffer, true);

  assert.equal(dds.image.width, 512);
  assert.equal(dds.image.height, 512);
  assert.equal(dds.image.format, RGBA_S3TC_DXT3_Format);
  assert.equal(dds.mipmaps.length, 1);
  assert.equal(dds.isCubemap, false);

  assert.end();

});

test(function(assert) {

  const buffer = readFixture('shannon-dxt5.dds');
  const dds = DDSParser.parse(buffer, true);

  assert.equal(dds.image.width, 512);
  assert.equal(dds.image.height, 512);
  assert.equal(dds.image.format, RGBA_S3TC_DXT5_Format);
  assert.equal(dds.mipmaps.length, 10);
  assert.equal(dds.isCubemap, false);

  assert.end();

});

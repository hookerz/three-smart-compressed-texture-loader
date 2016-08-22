import { Texture, CompressedTexture, XHRLoader, DefaultLoadingManager, WebGLExtensions } from 'three';
import { parse as parseATC } from './parsers/parse-atc';
import { parse as parseDDS } from './parsers/parse-dds';
import { parse as parsePVR } from './parsers/parse-pvr';

export const CompressedTextureEncoding = {
  
  ATC:   'WEBGL_compressed_texture_atc',
  ETC1:  'WEBGL_compressed_texture_etc1',
  S3TC:  'WEBGL_compressed_texture_s3tc',
  PVRTC: 'WEBGL_compressed_texture_pvrtc',
  
};

// Filter the texture extensions for the ones supported by the platform.
const SupportedTextureEncodings = (function() {

  const el = document.createElement('canvas');
  const gl = el.getContext('webgl') || el.getContext('experimental-webgl');
  
  // We're not querying the gl instance directly because thee three.js
  // WebGLExtensions class takes care of some vendor prefixing for us.
  const extensions = new WebGLExtensions(gl);
  
  return Object.keys(CompressedTextureEncoding)
    .map(key => CompressedTextureEncoding[key])
    .filter(val => extensions.get(val));
  
})();

/**
 * Construct a smart compressed texture loader.
 * @param {THREE.LoadingManager} [manager] - An optional loading manager.
 * @constructor
 */
function SmartCompressedTextureLoader(manager = DefaultLoadingManager) {
  
  this.encodings = SupportedTextureEncodings;
  this.manager   = manager;
  
}

Object.assign(SmartCompressedTextureLoader.prototype, {
  
  load: function (url, onLoad, onProgress, onError) {
    
    const loader = new XHRLoader(this.manager);
    const texture = new CompressedTexture();

    loader.setPath(this.path);
    loader.setResponseType('arraybuffer');
    loader.setWithCredentials(this.withCredentials);

    // Copy the extensions so we can iterate through them.
    const encodings = this.encodings.concat();
    
    function innerOnLoad(tex) {
      
      texture.copy(tex);
      texture.needsUpdate = true;

      if (onLoad !== undefined) onLoad(texture);

    }
    
    function innerOnError(event) {
      
      // TODO support falling back to the original URL
      
      loadNextEncoding();
      
    }
    
    function loadNextEncoding() {
      
      if (encodings.length === 0) {
        
        onError(/* TODO error object */);
      
      } else {
        
        const encoding = encodings.shift();
        loadTextureAsEncoding(url, encoding, loader, texture, innerOnLoad, onProgress, innerOnError);
        
      }
      
    }
    
    loadNextEncoding();
    
    return texture;
    
  },

  /**
   * 
   * @param {Array} encodings - A list of encodings to attempt when loading textures.
   */
  setSupportedEncodings: function (encodings) {
    
    // Union the desired encodings with the actual supported encodings. We
    // don't want to load an encoding that can't be read by the GPU.
    this.encodings = encodings.filter(enc => SupportedTextureEncodings.indexOf(enc) >= 0);
    
  },
  
  setCrossOrigin: function (value) {
    
    this.crossOrigin = value;
    return this;
    
  },
  
  setWithCredentials: function (value) {
    
    this.withCredentials = value;
    return this;
    
  },
  
  setPath: function (value) {
    
    this.path = value;
    return this;
    
  }
  
});

/**
 * Attempt to load a texture as a compressed texture by replacing the extension.
 * 
 * @param {String} url
 * @param {String} encoding
 * @param {THREE.XHRLoader} loader
 * @param {THREE.Texture} texture
 * @param {Function} onLoad
 * @param {Function} onProgress
 * @param {Function} onError
 */
function loadTextureAsEncoding(url, encoding, loader, texture, onLoad, onProgress, onError) {

  let extension, parse;

  // Pick the file extension and parsing function.
  switch (encoding) {

    case CompressedTextureEncoding.ATC:
      extension = 'atc';
      parse = parseATC;
      break;

    case CompressedTextureEncoding.ETC1:
      extension = 'etc';
      parse = parseDDS;
      break;

    case CompressedTextureEncoding.S3TC:
      extension = 'dds';
      parse = parseDDS;
      break;

    case CompressedTextureEncoding.PVRTC:
      extension = 'pvr';
      parse = parsePVR;
      break;

    default: throw new Error('Unrecognized texture encoding ' + encoding);

  }

  // Replace the original file extension with the encoding appropriate one.
  // Note: this won't preserve query strings because that gets complex.
  const encodingURL = url.replace(/(.*\.).*/, '$1' + extension);

  // Parse the buffer and pass the texture data to the original load handler.
  function parseOnLoad(buffer) {

    let parsedBuffer;

    try {

      parsedBuffer = parse(buffer, true);

    } catch(error) {

      // Only catch parse errors here.
      onError(/* TODO interpret error object */);

    }

    onLoad(parsedBuffer);

  }

  loader.load(encodingURL, parseOnLoad, onProgress, onError);

}

export { SmartCompressedTextureLoader };

import * as three from 'three';
import { SmartCompressedTextureLoader, CompressedTextureEncoding } from '../src';

const renderer = new three.WebGLRenderer();
renderer.setClearColor(0x0);

const camera = new three.PerspectiveCamera();
camera.position.z = 6;

const scene = new three.Scene();

const geo = new three.BoxBufferGeometry(1, 1, 1);
const mat = new three.MeshBasicMaterial({ color: 0xffffff });
const cube = new three.Mesh(geo, mat);
scene.add(cube);

function start() {

  document.body.appendChild(renderer.domElement);

  const loader = new SmartCompressedTextureLoader();
  
  // Exclude ETC1 and ATC from the supported encodings.
  loader.setSupportedEncodings([ CompressedTextureEncoding.S3TC, CompressedTextureEncoding.PVRTC ]);
  
  loader.load('./textures/shannon.png', (texture) => {
      
    console.log('loaded', texture);
    cube.material.map = texture;
    cube.material.needsUpdate = true;
    
  }, (progress) => {
    
    console.log('progress', progress);
    
  }, (error) => {
  
    console.error('failed', error);
    
  });
  
  resize();
  render();

}

function render() {

  cube.rotation.x += 0.002;
  cube.rotation.y += 0.004;

  renderer.render(scene, camera);

  requestAnimationFrame(render);

}

function resize() {

  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

}

window.addEventListener('load', start);
window.addEventListener('resize', resize);

import three from 'three';
import { SmartCompressedTextureLoader } from '../src';

const renderer = new three.WebGLRenderer();
renderer.setClearColor(0x0);

const camera = new three.PerspectiveCamera();
camera.position.z = 6;

const scene = new three.Scene();

const mat = new three.MeshStandardMaterial({ color: 0xff0000 });
const geo = new three.BoxBufferGeometry();
const cube = new three.Mesh(geo, mat);
scene.add(cube);


function start() {

  document.body.appendChild(renderer.domElement);

  const loader = new SmartCompressedTextureLoader();
  loader.load('./textures/shannon.png', (texture) => cube.material.map = texture);
  
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

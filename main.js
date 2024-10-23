import './style.css'
import * as THREE from 'three';
import * as CANNON from 'cannon-es';


let camera, scene, renderer;
let world;
const originalBoxSize = 3;
let stack = [];
let overHangs = [];
const boxHeight = 1;

let gameStart = false;


window.focus();
initGame();

function initGame() 
{
  scene = new THREE.Scene();
  world = new CANNON.World();
  world.gravity.set(0, -9.81, 0);


  AddLayer(0, 0, originalBoxSize, originalBoxSize);

  AddLayer(-10, 0, originalBoxSize, originalBoxSize, "x");


  const aspectRatio = window.innerWidth/window.innerHeight;
  const width = 10;
  const height = width/aspectRatio;
  
  camera = new THREE.OrthographicCamera(width/-2, width/2, height/2, height/ -2, 1, 100);
  scene.add(camera);
  camera.position.set(4, 4, 4);
  camera.lookAt(0, 0, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 20, 0);
  scene.add(directionalLight);


  const canvas = document.querySelector("canvas.threeJs");

//Declaring Renderer
  renderer = new THREE.WebGLRenderer
  ({
    canvas: canvas,
    antialias: true
  });

  // const controls = new OrbitControls(camera, canvas);
  // controls.enableDamping = true;

//Renderer properties for Antialiasing manually
  renderer.setSize(window.innerWidth, window.innerHeight);
  const maxPixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(maxPixelRatio);
  RenderScene();
}

const timeStep = 1.0/60;

function renderLoop()
{ 
    const speed = 5;

    const topLayer = stack[stack.length - 1];
    topLayer.threejs.position[topLayer.direction] += speed * timeStep;
    topLayer.cannonjs.position[topLayer.direction] += speed * timeStep;

    if(camera.position.y < boxHeight * (stack.length - 2) + 4)
      camera.position.y += speed * timeStep;

    if(topLayer.threejs.position[topLayer.direction] > 3 && gameStart)
    {
      gameStart = false;
      MissBlock();
    }
    // controls.update();
    RenderScene();
    updatePhysics();
}

function updatePhysics() 
{
  world.step(1 / 60);
  
  overHangs.forEach((element) =>
  {
    element.threejs.position.copy(element.cannonjs.position);
    // element.threejs.quaternion.copy(element.can.quaternion);
  });
}
  
// renderLoop();

function AddLayer(x, z, width, depth, direction)
{
  const y = boxHeight * stack.length;

  const layer = GenerateBox(x, y, z, width, depth, false);
  layer.direction = direction;

  stack.push(layer);
}

function AddOverHang(x, z, width, depth)
{
  const y = boxHeight * (stack.length - 1);

  const hang = GenerateBox(x, y, z, width, depth, true);

  overHangs.push(hang);
}

function GenerateBox(x, y, z, width, depth, falls)
{
  const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
  console.log(30 + stack.length * 4);
  const color = new THREE.Color(`hsl(${30 + stack.length * 4}, 100%, 50%)`);
  const material = new THREE.MeshLambertMaterial({color});
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  const shape = new CANNON.Box(new CANNON.Vec3(width/2, boxHeight/2, depth/2));
  let mass = falls ? 5 : 0;
  const body = new CANNON.Body({mass, shape});
  body.position.set(x, y, z);
  world.addBody(body);

  return {threejs: mesh, cannonjs: body, width, depth};
}

function MissBlock()
{
  const topLayer = stack[stack.length - 1];

  AddOverHang(topLayer.threejs.position.x, topLayer.threejs.position.z, topLayer.width, topLayer.depth);

  scene.remove(topLayer.threejs);
  // world.remove(topLayer.cannonjs);
}

window.addEventListener("click", () =>
{
  if(gameStart)
  {
    const topLayer = stack[stack.length - 1];
    const previousLayer = stack[stack.length - 2];

    const direction = topLayer.direction;
    const delta = topLayer.threejs.position[direction] - previousLayer.threejs.position[direction];

    const overHangSize = Math.abs(delta);
    const size = direction == "x" ? topLayer.width : topLayer.depth;

    const overLapSize = size - overHangSize;

    if(overLapSize > 0)
    {
      const newWidth = direction == "x" ? overLapSize : topLayer.width;
      const newDepth = direction == "z" ? overLapSize : topLayer.depth;

      topLayer.width = newWidth;
      topLayer.depth = newDepth;
    
      topLayer.threejs.scale[direction] = overLapSize/size;
      topLayer.threejs.position[direction] -= delta/2;

      topLayer.cannonjs.position[direction] -= delta/2;

      const shape = new CANNON.Box(new CANNON.Vec3(newWidth/2, boxHeight/2, newDepth/2));
      topLayer.cannonjs.shapes = [];
      topLayer.cannonjs.addShape(shape);


      //overhang
      const overHangShift = (overLapSize/2 + overHangSize/2) * Math.sign(delta);
      const overHangX = direction == "x" ? topLayer.threejs.position.x + overHangShift : topLayer.threejs.position.x;
      const overHangZ = direction == "z" ? topLayer.threejs.position.z + overHangShift : topLayer.threejs.position.z;

      const overHangWidth = direction == "x" ? overHangSize : newWidth;
      const overHangDepth = direction == "z" ? overHangSize : newDepth;

      AddOverHang(overHangX, overHangZ, overHangWidth, overHangDepth);


      const nextX = direction == "x" ? topLayer.threejs.position.x : -10;
      const nextZ = direction == "z" ? topLayer.threejs.position.z : -10;
      const nextDirection = direction == "x" ? "z" : "x";

      AddLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
    }
  }
  else
  {
    gameStart = true;
    renderer.setAnimationLoop(renderLoop);
  }
});

window.addEventListener("resize", () => 
{
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/ window.innerHeight;
  RenderScene();
});

function RenderScene()
{
  renderer.render(scene, camera);
}
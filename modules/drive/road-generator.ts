import * as THREE from 'three';

export interface RoadSceneController {
  update: (speedKmh: number, wheelRotationRad: number, lateralOffset: number, dt: number) => number;
  resize: (width: number, height: number) => void;
  dispose: () => void;
  setLighting: (mode: 'day' | 'night') => void;
  setAfterburner: (enabled: boolean) => void;
}

export function initRoadScene(canvas: HTMLCanvasElement): RoadSceneController {
  const width = canvas.clientWidth || 640;
  const height = canvas.clientHeight || 480;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0f12);
  scene.fog = new THREE.FogExp2(0x0d0f12, 0.012);

  const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 350);
  camera.position.set(0, 1.35, 0); // Cockpit eye height

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2));

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x00e599, 1.2);
  dirLight.position.set(20, 35, 25);
  scene.add(dirLight);

  // Headlight beam from car
  const headlight = new THREE.SpotLight(0xffffff, 2.5, 80, Math.PI / 4, 0.3, 1.0);
  headlight.position.set(0, 0.8, -0.5);
  headlight.target.position.set(0, 0, -25);
  scene.add(headlight);
  scene.add(headlight.target);

  // Road geometry: Segmented strip for real-time 3D curve deformation
  const roadWidth = 9.0;
  const roadLength = 260;
  const roadSegments = 120;
  const roadGeom = new THREE.PlaneGeometry(roadWidth, roadLength, 4, roadSegments);
  roadGeom.rotateX(-Math.PI / 2);

  // Material: High-contrast tarmac
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x16191e,
    roughness: 0.85,
    metalness: 0.1,
  });
  const roadMesh = new THREE.Mesh(roadGeom, roadMat);
  roadMesh.position.set(0, 0, -roadLength / 2);
  scene.add(roadMesh);

  // Racing kerbs / curbs (Alternating Neon Green & Pit Red)
  const curbMatGreen = new THREE.MeshBasicMaterial({ color: 0x00e599 });
  const curbMatRed = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
  const curbGeom = new THREE.BoxGeometry(0.4, 0.1, 3);
  const leftCurbs: THREE.Mesh[] = [];
  const rightCurbs: THREE.Mesh[] = [];

  for (let z = 0; z > -roadLength; z -= 3.2) {
    const isEven = Math.abs(Math.floor(z / 3.2)) % 2 === 0;
    const mat = isEven ? curbMatGreen : curbMatRed;

    const leftCurb = new THREE.Mesh(curbGeom, mat);
    leftCurb.position.set(-roadWidth / 2 - 0.2, 0.05, z);
    scene.add(leftCurb);
    leftCurbs.push(leftCurb);

    const rightCurb = new THREE.Mesh(curbGeom, mat);
    rightCurb.position.set(roadWidth / 2 + 0.2, 0.05, z);
    scene.add(rightCurb);
    rightCurbs.push(rightCurb);
  }

  // Dashed Centerline Lane Markings (Bright white / neon cyan)
  const lineGeom = new THREE.PlaneGeometry(0.22, 4.5);
  lineGeom.rotateX(-Math.PI / 2);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  const centerlines: THREE.Mesh[] = [];
  for (let z = 0; z > -roadLength; z -= 8.5) {
    const line = new THREE.Mesh(lineGeom, lineMat);
    line.position.set(0, 0.025, z);
    scene.add(line);
    centerlines.push(line);
  }

  // Roadside Props: Telemetry Pylons & Minimalist Tech Trees
  const treeGeom = new THREE.ConeGeometry(1.2, 3.8, 5);
  const treeMat = new THREE.MeshLambertMaterial({ color: 0x22303c });
  const poleGeom = new THREE.CylinderGeometry(0.08, 0.08, 4.5, 6);
  const poleMat = new THREE.MeshBasicMaterial({ color: 0x00e599 });

  const propsGroup = new THREE.Group();
  for (let i = 0; i < 44; i++) {
    const z = -i * 5.8;
    const side = i % 2 === 0 ? 1 : -1;
    const tree = new THREE.Mesh(treeGeom, treeMat);
    tree.position.set(side * (roadWidth / 2 + 3.2 + (i % 3)), 1.9, z);
    propsGroup.add(tree);

    if (i % 3 === 0) {
      const pole = new THREE.Mesh(poleGeom, poleMat);
      pole.position.set(side * (roadWidth / 2 + 0.8), 2.2, z);
      propsGroup.add(pole);
    }
  }
  scene.add(propsGroup);

  // 3D Virtual Steering Wheel Mesh
  const wheelGroup = new THREE.Group();
  const rimGeom = new THREE.TorusGeometry(0.36, 0.032, 12, 32);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x1a202c,
    roughness: 0.4,
    metalness: 0.6,
  });
  const rimMesh = new THREE.Mesh(rimGeom, rimMat);
  wheelGroup.add(rimMesh);

  // Center hub & spokes
  const hubGeom = new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16);
  hubGeom.rotateX(Math.PI / 2);
  const hubMesh = new THREE.Mesh(hubGeom, rimMat);
  wheelGroup.add(hubMesh);

  const spokeGeom = new THREE.BoxGeometry(0.68, 0.03, 0.02);
  const spokeMesh = new THREE.Mesh(spokeGeom, rimMat);
  wheelGroup.add(spokeMesh);

  // 12-o'clock neon apex marker on steering wheel
  const markerGeom = new THREE.BoxGeometry(0.04, 0.07, 0.07);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0x00e599 });
  const markerMesh = new THREE.Mesh(markerGeom, markerMat);
  markerMesh.position.set(0, 0.36, 0);
  wheelGroup.add(markerMesh);

  // Position steering wheel inside driver cockpit
  wheelGroup.position.set(0, 0.95, -0.75);
  wheelGroup.rotation.x = -0.28;
  scene.add(wheelGroup);

  // Ground plane (Expansive run-off area)
  const groundGeom = new THREE.PlaneGeometry(350, 350);
  groundGeom.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x090a0d });
  const groundMesh = new THREE.Mesh(groundGeom, groundMat);
  groundMesh.position.set(0, -0.06, -100);
  scene.add(groundMesh);

  // Road Curve State
  let travelZ = 0;
  let currentRoadCurvature = 0;

  const update = (
    speedKmh: number,
    wheelRotationRad: number,
    lateralOffset: number,
    dt: number
  ): number => {
    const speedMps = (speedKmh * 1000) / 3600;
    travelZ += speedMps * dt;

    // Road curvature computed via continuous sine curve
    currentRoadCurvature = Math.sin(travelZ * 0.012) * 0.4;

    // Dynamically bend the road mesh in 3D
    const posAttr = roadGeom.attributes.position;
    if (posAttr) {
      for (let i = 0; i < posAttr.count; i++) {
        const localZ = posAttr.getY(i); // PlaneGeometry rotatedX(-90deg)
        const worldZ = localZ - travelZ;
        const curveOffset = Math.sin(worldZ * 0.015) * 4.2;
        posAttr.setX(i, (i % 5 - 2) * (roadWidth / 4) + curveOffset);
      }
      posAttr.needsUpdate = true;
    }

    // Shift lane lines and curbs along Z to simulate motion
    centerlines.forEach((line) => {
      line.position.z += speedMps * dt;
      if (line.position.z > 5) {
        line.position.z -= roadLength;
      }
      const curveOffset = Math.sin((line.position.z - travelZ) * 0.015) * 4.2;
      line.position.x = curveOffset;
    });

    leftCurbs.forEach((curb) => {
      curb.position.z += speedMps * dt;
      if (curb.position.z > 5) curb.position.z -= roadLength;
      const curveOffset = Math.sin((curb.position.z - travelZ) * 0.015) * 4.2;
      curb.position.x = -roadWidth / 2 - 0.2 + curveOffset;
    });

    rightCurbs.forEach((curb) => {
      curb.position.z += speedMps * dt;
      if (curb.position.z > 5) curb.position.z -= roadLength;
      const curveOffset = Math.sin((curb.position.z - travelZ) * 0.015) * 4.2;
      curb.position.x = roadWidth / 2 + 0.2 + curveOffset;
    });

    propsGroup.children.forEach((child) => {
      child.position.z += speedMps * dt;
      if (child.position.z > 5) {
        child.position.z -= roadLength;
      }
    });

    // Lateral camera positioning based on vehicle drift & roll
    camera.position.x = lateralOffset * 2.8;
    camera.rotation.y = -lateralOffset * 0.12 - currentRoadCurvature * 0.25;
    camera.rotation.z = -wheelRotationRad * 0.08; // subtle cockpit chassis roll

    // Headlight position tracking
    headlight.position.x = camera.position.x;
    headlight.target.position.x = camera.position.x - wheelRotationRad * 5;

    // Rotate 3D steering wheel to match hand orientation
    wheelGroup.position.x = camera.position.x;
    wheelGroup.rotation.z = -wheelRotationRad;

    renderer.render(scene, camera);
    return currentRoadCurvature;
  };

  const resize = (newWidth: number, newHeight: number) => {
    if (newWidth <= 0 || newHeight <= 0) return;
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
  };

  let isAfterburnerActive = false;

  const setAfterburner = (enabled: boolean) => {
    isAfterburnerActive = enabled;
    if (enabled) {
      scene.background = new THREE.Color(0x0b0014);
      scene.fog = new THREE.FogExp2(0x19002e, 0.015);
      lineMat.color.set(0xff007f);
      curbMatGreen.color.set(0x00f5d4);
      curbMatRed.color.set(0xf72585);
      dirLight.color.set(0x9d4edd);
      headlight.color.set(0x00f5d4);
      camera.fov = 68;
      camera.updateProjectionMatrix();
    } else {
      lineMat.color.set(0x06b6d4);
      curbMatGreen.color.set(0x00e599);
      curbMatRed.color.set(0xff3b30);
      headlight.color.set(0xffffff);
      camera.fov = 55;
      camera.updateProjectionMatrix();
      setLighting('night');
    }
  };

  const setLighting = (mode: 'day' | 'night') => {
    if (isAfterburnerActive) return;
    if (mode === 'day') {
      scene.background = new THREE.Color(0xf4eedc);
      scene.fog = new THREE.FogExp2(0xf4eedc, 0.012);
      roadMat.color.set(0x3a3a3a);
      groundMat.color.set(0xeae2cb);
      dirLight.color.set(0xfff0d0);
      ambientLight.color.set(0xfff7e6);
      headlight.intensity = 0.5;
    } else {
      scene.background = new THREE.Color(0x0d0f12);
      scene.fog = new THREE.FogExp2(0x0d0f12, 0.012);
      roadMat.color.set(0x16191e);
      groundMat.color.set(0x090a0d);
      dirLight.color.set(0x00e599);
      ambientLight.color.set(0xffffff);
      headlight.intensity = 2.5;
    }
  };

  const dispose = () => {
    roadGeom.dispose();
    roadMat.dispose();
    lineGeom.dispose();
    lineMat.dispose();
    curbGeom.dispose();
    curbMatGreen.dispose();
    curbMatRed.dispose();
    treeGeom.dispose();
    treeMat.dispose();
    poleGeom.dispose();
    poleMat.dispose();
    rimGeom.dispose();
    rimMat.dispose();
    hubGeom.dispose();
    spokeGeom.dispose();
    markerGeom.dispose();
    markerMat.dispose();
    groundGeom.dispose();
    groundMat.dispose();
    renderer.dispose();
  };

  return { update, resize, dispose, setLighting, setAfterburner };
}

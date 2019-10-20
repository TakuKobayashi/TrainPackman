import * as THREE from 'three';
import { Layer } from 'mapbox-gl';

export class TrainLayer implements Layer{
  id: any;
  renderingMode: string;
  map: any;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  light: THREE.DirectionalLight;
  camera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster;

  constructor(id) {
    this.id = id;
    this.type = 'custom';
    this.renderingMode = '3d';
  }

  onAdd(map, gl) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
    });
    this.scene = new THREE.Scene();
    this.light = new THREE.DirectionalLight(0xffffff, 0.8);

    this.renderer.autoClear = false;

    this.scene.add(this.light);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    // This is needed to avoid a black screen with empty scene
    this.scene.add(new THREE.Mesh());

    this.map = map;
    this.camera = new THREE.PerspectiveCamera(map.transform._fov / DEGREE_TO_RADIAN, window.innerWidth / window.innerHeight);
    this.raycaster = new THREE.Raycaster();
  }

  render(gl, matrix) {
    var id = this.id;
    var map = this.map;
    var renderer = this.renderer;
    var camera = this.camera;
    var transform = map.transform;
    var halfFov = transform._fov / 2;
    var cameraToCenterDistance = transform.cameraToCenterDistance;
    var angle = Math.PI / 2 - transform._pitch;
    var topHalfSurfaceDistance = (Math.sin(halfFov) * cameraToCenterDistance) / Math.sin(angle - halfFov);
    var furthestDistance = Math.cos(angle) * topHalfSurfaceDistance + cameraToCenterDistance;
    var nearZ = transform.height / 50;
    var halfHeight = Math.tan(halfFov) * nearZ;
    var halfWidth = (halfHeight * transform.width) / transform.height;

    var m = new THREE.Matrix4().fromArray(matrix);
    var l = new THREE.Matrix4().makeTranslation(modelOrigin.x, modelOrigin.y, 0).scale(new THREE.Vector3(1, -1, 1));

    var projectionMatrixI = new THREE.Matrix4();

    camera.projectionMatrix = new THREE.Matrix4().makePerspective(
      -halfWidth,
      halfWidth,
      halfHeight,
      -halfHeight,
      nearZ,
      furthestDistance * 1.01,
    );
    projectionMatrixI.getInverse(camera.projectionMatrix);
    camera.matrix.getInverse(projectionMatrixI.multiply(m).multiply(l));
    camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);

    if (id.indexOf('-ug', id.length - 3) !== -1 && isUndergroundVisible) {
      // Recalculate the projection matrix to replace the far plane
      camera.projectionMatrix = new THREE.Matrix4().makePerspective(
        -halfWidth,
        halfWidth,
        halfHeight,
        -halfHeight,
        nearZ,
        furthestDistance * 2.5,
      );
    }

    var rad = (map.getBearing() + 30) * DEGREE_TO_RADIAN;
    this.light.position.set(-Math.sin(rad), -Math.cos(rad), SQRT3).normalize();

    renderer.state.reset();
    renderer.render(this.scene, camera);
    map.triggerRepaint();
  }

  onResize(event) {
    var camera = this.camera;
    var transform = event.target.transform;

    camera.aspect = transform.width / transform.height;
    camera.updateProjectionMatrix();
  }

  pickObject(point) {
    var mouse = new THREE.Vector2((point.x / window.innerWidth) * 2 - 1, -(point.y / window.innerHeight) * 2 + 1);
    var raycaster = this.raycaster;
    var intersects, i;

    raycaster.setFromCamera(mouse, this.camera);
    intersects = raycaster.intersectObjects(this.scene.children);
    for (i = 0; i < intersects.length; i++) {
      if (intersects[i].object.userData.coord) {
        return intersects[i].object;
      }
    }
  }
}

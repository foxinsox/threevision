/* eslint-disable no-underscore-dangle */
/* eslint-disable linebreak-style */
import {
  TextureLoader,
  MeshBasicMaterial,
  Vector3,
  Group,
  Clock,
  Raycaster,
} from 'three';
import Prism from './prism';

const three = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    TextureLoader,
    MeshBasicMaterial,
    Vector3,
    Group,
    Clock,
    Raycaster,
  };


export default class extends three.Group {
  constructor(content, width, height, vertical = false, easing = 0.05, prismCount = 24, speed = 4, shadows = true, mouseOverEffect = false) {
    super();
    // init class fields

    // array containing image paths/urls or THREE.Color objects.
    // this array can contain different types!
    this._content = content;
    this._width = width;
    this._height = height;
    this._easing = easing;
    this._prismCount = prismCount;
    this._speed = speed;
    this._shadows = shadows;
    this._vertical = vertical;
    this._mouseOverEffect = mouseOverEffect;

    this._readyToRefresh = false;
    this._clock = new three.Clock();
    this._previousStep = 0;
    this._previousMousePos = new three.Vector3(0, 0, 0);
    this._raycaster = new three.Raycaster();
    if (!this._content || this._content.length === 0) this._content = [new three.Color(0xaaaaaa)];
    this._init();
  }

  // Getters & Setters
  set content(content) { this._content = content; this._init(); }

  get content() { return this._content; }

  set width(width) { this._width = width; this._init(); }

  get width() { return this._width; }

  set height(height) { this._height = height; this._init(); }

  get height() { return this._height; }

  set easing(easing) { this._easing = easing; }

  get easing() { return this._easing; }

  set prismCount(prismCount) { this._prismCount = prismCount; this._init(); }

  get prismCount() { return this._prismCount; }

  set speed(speed) { this._speed = speed; }

  get speed() { return this._speed; }

  set shadows(shadows) { this._shadows = shadows; }

  get shadows() { return this._shadows; }

  set vertical(vertical) { this._vertical = vertical; this._init(); }

  get vertical() { return this._vertical; }

  set mouseOverEffect(mouseOverEffect) { this._mouseOverEffect = mouseOverEffect; }

  get mouseOverEffect() { return this._mouseOverEffect; }

  _prepareMaterials() {
    // prepare mesh materials
    const materials = [];
    this._content.forEach((el) => {
      if (typeof (el) === 'string') {
        const texture = new three.TextureLoader().load(el);
        materials.push(new three.MeshBasicMaterial({ map: texture }));
      }
      if (typeof (el) === 'object') {
        materials.push(new three.MeshBasicMaterial({ color: el }));
      }
    });
    return materials;
  }

  _init() {
    // if re-initialization: remove old threevision from scene before creating a new one
    if (this.children) {
      this.children = [];
    }

    this._materials = this._prepareMaterials();

    let prismWidth = this.width * 0.5;
    let prismHeight = (this.height * 0.5) / this.prismCount;
    if (this.vertical) {
      prismWidth = this.height * 0.5;
      prismHeight = (this.width * 0.5) / this.prismCount;
    }

    for (let index = 0; index < this.prismCount; index += 1) {
      const prism = new Prism(index, this.prismCount, this._materials, prismWidth, prismHeight, this.shadows, this.vertical);
      // arrange position for threevision structure
      prism.rotation.y += Math.PI / 2;
      prism.position.y -= ((this.prismCount / 2) * prismHeight) - prismHeight / 2;
      prism.position.y += index * prismHeight;
      this.add(prism);
    }
    if (this.vertical) {
      this.rotation.z -= Math.PI / 2;
    }
  }


  _applyMouseOverEffect(scene, camera, mousePos) {
    const currentMousePos = new three.Vector3(mousePos.x, mousePos.y, mousePos.z);
    const deltaMousePos = new three.Vector3().subVectors(this._previousMousePos, currentMousePos);

    let delta;
    if (this.vertical) delta = deltaMousePos.x;
    else delta = deltaMousePos.y;
    if (!this._readyToRefresh && delta !== 0) {
      // update the picking ray with the camera and mousePos position
      this._raycaster.setFromCamera(mousePos, camera);
      // calculate objects intersecting the picking ray
      const intersects = this._raycaster.intersectObjects(scene.children.filter((obj) => obj.type === 'Group'), true);
      for (let i = 0; i < intersects.length; i += 1) {
        const { uuid } = intersects[i].object;
        const prism = this.children.find((obj) => obj.uuid === uuid);
        if (prism) {
          prism.step += delta * 10;
        }
      }
    }
    this._previousMousePos = currentMousePos;
  }

  _updatePrismsStep(step) {
    // set new step rotation
    if (step !== this._previousStep) {
      this.children.map((p) => {
        const prism = p;
        prism.step = step;
        return prism;
      });
      this._previousStep = step;
      this._readyToRefresh = true;
    }
  }

  _updatePrismsRotation() {
    let totalMovement = 0;
    const maxRotation = this.speed * this._clock.getDelta();

    this.children.map((prism) => {
      totalMovement += prism.motion;
      return prism.update(maxRotation, this.easing);
    });

    if (this._readyToRefresh && totalMovement < 0.01) {
      this._readyToRefresh = false;
    }
  }

  // animation updates
  update(step, scene, camera, mousePos) {
    if (mousePos && scene && camera && this.mouseOverEffect) {
      this._applyMouseOverEffect(scene, camera, mousePos);
    }

    this._updatePrismsStep(step);
    this._updatePrismsRotation();
  }
}

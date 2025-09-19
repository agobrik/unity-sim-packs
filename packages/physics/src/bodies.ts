import {
  RigidBodyState,
  RigidBodyDefinition,
  Vector3D,
  Quaternion,
  Matrix3x3,
  PhysicsMaterial,
  CollisionShape,
  ShapeType
} from './types';
import { Vec3, Quat, Mat3 } from './math';

export class RigidBody {
  private static nextId = 0;

  public readonly id: string;
  public state: RigidBodyState;
  public shape: CollisionShape;
  public material: PhysicsMaterial;

  private previousState: RigidBodyState;
  private forces: Vector3D = Vec3.zero();
  private torques: Vector3D = Vec3.zero();

  constructor(definition: RigidBodyDefinition) {
    this.id = `body_${RigidBody.nextId++}`;
    this.shape = definition.shape;
    this.material = definition.material || this.getDefaultMaterial();

    const mass = definition.mass || (definition.isStatic ? 0 : 1);
    const inverseMass = definition.isStatic || mass === 0 ? 0 : 1 / mass;

    this.state = {
      position: definition.position || Vec3.zero(),
      rotation: definition.rotation || Quat.identity(),
      linearVelocity: definition.linearVelocity || Vec3.zero(),
      angularVelocity: definition.angularVelocity || Vec3.zero(),
      mass,
      inverseMass,
      inertiaTensor: this.calculateInertiaTensor(definition.shape, mass),
      inverseInertiaTensor: Mat3.identity(),
      restitution: definition.restitution || this.material.restitution,
      friction: definition.friction || this.material.staticFriction,
      isStatic: definition.isStatic || false,
      isKinematic: definition.isKinematic || false,
      isActive: true
    };

    this.updateInverseInertiaTensor();
    this.previousState = { ...this.state };
  }

  private getDefaultMaterial(): PhysicsMaterial {
    return {
      density: 1.0,
      restitution: 0.3,
      staticFriction: 0.7,
      dynamicFriction: 0.5,
      rollingFriction: 0.01
    };
  }

  private calculateInertiaTensor(shape: CollisionShape, mass: number): Matrix3x3 {
    if (mass === 0) return Mat3.identity();

    switch (shape.type) {
      case ShapeType.BOX:
        return this.calculateBoxInertia(shape.data, mass);
      case ShapeType.SPHERE:
        return this.calculateSphereInertia(shape.data.radius, mass);
      case ShapeType.CYLINDER:
        return this.calculateCylinderInertia(shape.data.radius, shape.data.height, mass);
      case ShapeType.CAPSULE:
        return this.calculateCapsuleInertia(shape.data.radius, shape.data.height, mass);
      default:
        return this.calculateBoxInertia({ halfExtents: { x: 1, y: 1, z: 1 } }, mass);
    }
  }

  private calculateBoxInertia(boxData: any, mass: number): Matrix3x3 {
    const { halfExtents } = boxData;
    const x2 = halfExtents.x * halfExtents.x;
    const y2 = halfExtents.y * halfExtents.y;
    const z2 = halfExtents.z * halfExtents.z;

    const ixx = (mass / 3) * (y2 + z2);
    const iyy = (mass / 3) * (x2 + z2);
    const izz = (mass / 3) * (x2 + y2);

    return {
      elements: [
        ixx, 0, 0,
        0, iyy, 0,
        0, 0, izz
      ]
    };
  }

  private calculateSphereInertia(radius: number, mass: number): Matrix3x3 {
    const inertia = (2 / 5) * mass * radius * radius;

    return {
      elements: [
        inertia, 0, 0,
        0, inertia, 0,
        0, 0, inertia
      ]
    };
  }

  private calculateCylinderInertia(radius: number, height: number, mass: number): Matrix3x3 {
    const r2 = radius * radius;
    const h2 = height * height;

    const ixx = mass * (3 * r2 + h2) / 12;
    const iyy = mass * r2 / 2;
    const izz = ixx;

    return {
      elements: [
        ixx, 0, 0,
        0, iyy, 0,
        0, 0, izz
      ]
    };
  }

  private calculateCapsuleInertia(radius: number, height: number, mass: number): Matrix3x3 {
    const cylinderHeight = height - 2 * radius;
    const sphereVolume = (4/3) * Math.PI * radius * radius * radius;
    const cylinderVolume = Math.PI * radius * radius * cylinderHeight;
    const totalVolume = sphereVolume + cylinderVolume;

    const sphereMass = mass * (sphereVolume / totalVolume);
    const cylinderMass = mass * (cylinderVolume / totalVolume);

    const sphereInertia = (2/5) * sphereMass * radius * radius;
    const cylinderInertiaXZ = cylinderMass * (3 * radius * radius + cylinderHeight * cylinderHeight) / 12;
    const cylinderInertiaY = cylinderMass * radius * radius / 2;

    const totalInertiaXZ = sphereInertia + cylinderInertiaXZ;
    const totalInertiaY = sphereInertia + cylinderInertiaY;

    return {
      elements: [
        totalInertiaXZ, 0, 0,
        0, totalInertiaY, 0,
        0, 0, totalInertiaXZ
      ]
    };
  }

  private updateInverseInertiaTensor(): void {
    if (this.state.mass === 0) {
      this.state.inverseInertiaTensor = Mat3.zero();
      return;
    }

    try {
      const worldInertia = this.getWorldInertiaTensor();
      this.state.inverseInertiaTensor = Mat3.inverse(worldInertia);
    } catch {
      this.state.inverseInertiaTensor = Mat3.zero();
    }
  }

  private getWorldInertiaTensor(): Matrix3x3 {
    const rotationMatrix = Mat3.fromQuaternion(this.state.rotation);
    const rotationTranspose = Mat3.transpose(rotationMatrix);

    const temp = Mat3.multiply(rotationMatrix, this.state.inertiaTensor);
    return Mat3.multiply(temp, rotationTranspose);
  }

  public addForce(force: Vector3D): void {
    this.forces = Vec3.add(this.forces, force);
  }

  public addForceAtPosition(force: Vector3D, position: Vector3D): void {
    this.addForce(force);

    const r = Vec3.subtract(position, this.state.position);
    const torque = Vec3.cross(r, force);
    this.addTorque(torque);
  }

  public addTorque(torque: Vector3D): void {
    this.torques = Vec3.add(this.torques, torque);
  }

  public clearForces(): void {
    this.forces = Vec3.zero();
    this.torques = Vec3.zero();
  }

  public integrate(deltaTime: number): void {
    if (this.state.isStatic) return;

    this.previousState = { ...this.state };

    const acceleration = Vec3.multiply(this.forces, this.state.inverseMass);
    this.state.linearVelocity = Vec3.add(this.state.linearVelocity, Vec3.multiply(acceleration, deltaTime));
    this.state.position = Vec3.add(this.state.position, Vec3.multiply(this.state.linearVelocity, deltaTime));

    if (!this.state.isKinematic) {
      const angularAcceleration = Mat3.multiplyVector(this.state.inverseInertiaTensor, this.torques);
      this.state.angularVelocity = Vec3.add(this.state.angularVelocity, Vec3.multiply(angularAcceleration, deltaTime));

      const angularDisplacement = Vec3.multiply(this.state.angularVelocity, deltaTime);
      const angularMagnitude = Vec3.magnitude(angularDisplacement);

      if (angularMagnitude > 0) {
        const axis = Vec3.normalize(angularDisplacement);
        const deltaRotation = Quat.fromAxisAngle(axis, angularMagnitude);
        this.state.rotation = Quat.normalize(Quat.multiply(this.state.rotation, deltaRotation));
      }
    }

    this.updateInverseInertiaTensor();
    this.updateSleepState();
  }

  private updateSleepState(): void {
    const velocityThreshold = 0.1;
    const angularThreshold = 0.1;

    const linearSpeed = Vec3.magnitude(this.state.linearVelocity);
    const angularSpeed = Vec3.magnitude(this.state.angularVelocity);

    if (linearSpeed < velocityThreshold && angularSpeed < angularThreshold) {
      this.state.isActive = false;
      this.state.linearVelocity = Vec3.zero();
      this.state.angularVelocity = Vec3.zero();
    } else {
      this.state.isActive = true;
    }
  }

  public wakeUp(): void {
    this.state.isActive = true;
  }

  public setPosition(position: Vector3D): void {
    this.state.position = position;
    this.wakeUp();
  }

  public setRotation(rotation: Quaternion): void {
    this.state.rotation = Quat.normalize(rotation);
    this.updateInverseInertiaTensor();
    this.wakeUp();
  }

  public setLinearVelocity(velocity: Vector3D): void {
    this.state.linearVelocity = velocity;
    this.wakeUp();
  }

  public setAngularVelocity(velocity: Vector3D): void {
    this.state.angularVelocity = velocity;
    this.wakeUp();
  }

  public setMass(mass: number): void {
    this.state.mass = mass;
    this.state.inverseMass = mass === 0 ? 0 : 1 / mass;
    this.state.inertiaTensor = this.calculateInertiaTensor(this.shape, mass);
    this.updateInverseInertiaTensor();
  }

  public applyImpulse(impulse: Vector3D): void {
    if (this.state.isStatic) return;

    const deltaVelocity = Vec3.multiply(impulse, this.state.inverseMass);
    this.state.linearVelocity = Vec3.add(this.state.linearVelocity, deltaVelocity);
    this.wakeUp();
  }

  public applyImpulseAtPosition(impulse: Vector3D, position: Vector3D): void {
    if (this.state.isStatic) return;

    this.applyImpulse(impulse);

    const r = Vec3.subtract(position, this.state.position);
    const angularImpulse = Vec3.cross(r, impulse);
    const deltaAngularVelocity = Mat3.multiplyVector(this.state.inverseInertiaTensor, angularImpulse);

    this.state.angularVelocity = Vec3.add(this.state.angularVelocity, deltaAngularVelocity);
  }

  public getKineticEnergy(): number {
    const linearKE = 0.5 * this.state.mass * Vec3.lengthSquared(this.state.linearVelocity);
    const angularKE = 0.5 * Vec3.dot(this.state.angularVelocity,
      Mat3.multiplyVector(this.state.inertiaTensor, this.state.angularVelocity));

    return linearKE + angularKE;
  }

  public getMomentum(): Vector3D {
    return Vec3.multiply(this.state.linearVelocity, this.state.mass);
  }

  public getAngularMomentum(): Vector3D {
    return Mat3.multiplyVector(this.state.inertiaTensor, this.state.angularVelocity);
  }

  public predictPosition(deltaTime: number): Vector3D {
    const velocity = this.state.linearVelocity;
    const acceleration = Vec3.multiply(this.forces, this.state.inverseMass);

    return Vec3.add(this.state.position, Vec3.add(
      Vec3.multiply(velocity, deltaTime),
      Vec3.multiply(acceleration, 0.5 * deltaTime * deltaTime)
    ));
  }

  public predictRotation(deltaTime: number): Quaternion {
    const angularVelocity = this.state.angularVelocity;
    const angularAcceleration = Mat3.multiplyVector(this.state.inverseInertiaTensor, this.torques);

    const predictedAngularVelocity = Vec3.add(angularVelocity, Vec3.multiply(angularAcceleration, deltaTime));
    const angularDisplacement = Vec3.multiply(predictedAngularVelocity, deltaTime);
    const angularMagnitude = Vec3.magnitude(angularDisplacement);

    if (angularMagnitude > 0) {
      const axis = Vec3.normalize(angularDisplacement);
      const deltaRotation = Quat.fromAxisAngle(axis, angularMagnitude);
      return Quat.normalize(Quat.multiply(this.state.rotation, deltaRotation));
    }

    return this.state.rotation;
  }

  public interpolateState(alpha: number): RigidBodyState {
    return {
      ...this.state,
      position: Vec3.lerp(this.previousState.position, this.state.position, alpha),
      rotation: Quat.slerp(this.previousState.rotation, this.state.rotation, alpha),
      linearVelocity: Vec3.lerp(this.previousState.linearVelocity, this.state.linearVelocity, alpha),
      angularVelocity: Vec3.lerp(this.previousState.angularVelocity, this.state.angularVelocity, alpha)
    };
  }

  public clone(): RigidBody {
    const definition: RigidBodyDefinition = {
      position: this.state.position,
      rotation: this.state.rotation,
      linearVelocity: this.state.linearVelocity,
      angularVelocity: this.state.angularVelocity,
      mass: this.state.mass,
      restitution: this.state.restitution,
      friction: this.state.friction,
      isStatic: this.state.isStatic,
      isKinematic: this.state.isKinematic,
      shape: this.shape,
      material: this.material
    };

    return new RigidBody(definition);
  }

  public serialize(): any {
    return {
      id: this.id,
      state: this.state,
      shape: this.shape,
      material: this.material,
      forces: this.forces,
      torques: this.torques
    };
  }

  public static deserialize(data: any): RigidBody {
    const definition: RigidBodyDefinition = {
      position: data.state.position,
      rotation: data.state.rotation,
      linearVelocity: data.state.linearVelocity,
      angularVelocity: data.state.angularVelocity,
      mass: data.state.mass,
      restitution: data.state.restitution,
      friction: data.state.friction,
      isStatic: data.state.isStatic,
      isKinematic: data.state.isKinematic,
      shape: data.shape,
      material: data.material
    };

    const body = new RigidBody(definition);
    body.forces = data.forces || Vec3.zero();
    body.torques = data.torques || Vec3.zero();

    return body;
  }
}

export class BodyManager {
  private bodies: Map<string, RigidBody> = new Map();
  private activeBodies: Set<string> = new Set();
  private staticBodies: Set<string> = new Set();

  public addBody(body: RigidBody): void {
    this.bodies.set(body.id, body);

    if (body.state.isStatic) {
      this.staticBodies.add(body.id);
    } else if (body.state.isActive) {
      this.activeBodies.add(body.id);
    }
  }

  public removeBody(id: string): void {
    this.bodies.delete(id);
    this.activeBodies.delete(id);
    this.staticBodies.delete(id);
  }

  public getBody(id: string): RigidBody | undefined {
    return this.bodies.get(id);
  }

  public getAllBodies(): RigidBody[] {
    return Array.from(this.bodies.values());
  }

  public getActiveBodies(): RigidBody[] {
    return Array.from(this.activeBodies).map(id => this.bodies.get(id)!).filter(body => body);
  }

  public getStaticBodies(): RigidBody[] {
    return Array.from(this.staticBodies).map(id => this.bodies.get(id)!).filter(body => body);
  }

  public updateActiveBodies(): void {
    this.activeBodies.clear();

    for (const [id, body] of this.bodies) {
      if (!body.state.isStatic && body.state.isActive) {
        this.activeBodies.add(id);
      }
    }
  }

  public integrateAllBodies(deltaTime: number): void {
    for (const body of this.getActiveBodies()) {
      body.integrate(deltaTime);
    }

    this.updateActiveBodies();
  }

  public clearAllForces(): void {
    for (const body of this.bodies.values()) {
      body.clearForces();
    }
  }

  public getBodyCount(): number {
    return this.bodies.size;
  }

  public getActiveBodyCount(): number {
    return this.activeBodies.size;
  }

  public getStaticBodyCount(): number {
    return this.staticBodies.size;
  }

  public clear(): void {
    this.bodies.clear();
    this.activeBodies.clear();
    this.staticBodies.clear();
  }
}
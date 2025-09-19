import {
  Vector3D,
  ContactManifold,
  Contact,
  ConstraintDefinition,
  ConstraintType,
  Joint,
  JointType
} from './types';
import { Vec3, Mat3 } from './math';
import { RigidBody } from './bodies';

export interface ContactConstraint {
  bodyA: RigidBody;
  bodyB: RigidBody;
  contact: Contact;
  normalMass: number;
  tangentMass: Vector3D;
  velocityBias: number;
  positionBias: number;
}

export interface JointConstraint {
  joint: Joint;
  bodyA: RigidBody;
  bodyB: RigidBody;
  jacobian: number[];
  bias: number;
  effectiveMass: number;
  impulse: number;
}

export class ConstraintSolver {
  private contactConstraints: ContactConstraint[] = [];
  private jointConstraints: JointConstraint[] = [];
  private iterations: number = 10;
  private baumgarteStabilization: number = 0.2;
  private penetrationSlop: number = 0.01;

  public setIterations(iterations: number): void {
    this.iterations = iterations;
  }

  public setBaumgarteStabilization(factor: number): void {
    this.baumgarteStabilization = factor;
  }

  public setPenetrationSlop(slop: number): void {
    this.penetrationSlop = slop;
  }

  public prepareContacts(manifolds: ContactManifold[], bodies: Map<string, RigidBody>, deltaTime: number): void {
    this.contactConstraints = [];

    for (const manifold of manifolds) {
      const bodyA = bodies.get(manifold.bodyA);
      const bodyB = bodies.get(manifold.bodyB);

      if (!bodyA || !bodyB) continue;

      for (const contact of manifold.contacts) {
        const constraint = this.createContactConstraint(bodyA, bodyB, contact, deltaTime);
        this.contactConstraints.push(constraint);
      }
    }
  }

  private createContactConstraint(bodyA: RigidBody, bodyB: RigidBody, contact: Contact, deltaTime: number): ContactConstraint {
    const rA = Vec3.subtract(contact.pointA, bodyA.state.position);
    const rB = Vec3.subtract(contact.pointB, bodyB.state.position);

    const crossA = Vec3.cross(rA, contact.normal);
    const crossB = Vec3.cross(rB, contact.normal);

    const angularFactorA = Mat3.multiplyVector(bodyA.state.inverseInertiaTensor, crossA);
    const angularFactorB = Mat3.multiplyVector(bodyB.state.inverseInertiaTensor, crossB);

    const normalMass =
      bodyA.state.inverseMass + bodyB.state.inverseMass +
      Vec3.dot(crossA, angularFactorA) + Vec3.dot(crossB, angularFactorB);

    const tangent1 = this.getTangentVector(contact.normal);
    const tangent2 = Vec3.cross(contact.normal, tangent1);

    const tangentCrossA1 = Vec3.cross(rA, tangent1);
    const tangentCrossB1 = Vec3.cross(rB, tangent1);
    const tangentFactorA1 = Mat3.multiplyVector(bodyA.state.inverseInertiaTensor, tangentCrossA1);
    const tangentFactorB1 = Mat3.multiplyVector(bodyB.state.inverseInertiaTensor, tangentCrossB1);

    const tangentMass1 =
      bodyA.state.inverseMass + bodyB.state.inverseMass +
      Vec3.dot(tangentCrossA1, tangentFactorA1) + Vec3.dot(tangentCrossB1, tangentFactorB1);

    const tangentCrossA2 = Vec3.cross(rA, tangent2);
    const tangentCrossB2 = Vec3.cross(rB, tangent2);
    const tangentFactorA2 = Mat3.multiplyVector(bodyA.state.inverseInertiaTensor, tangentCrossA2);
    const tangentFactorB2 = Mat3.multiplyVector(bodyB.state.inverseInertiaTensor, tangentCrossB2);

    const tangentMass2 =
      bodyA.state.inverseMass + bodyB.state.inverseMass +
      Vec3.dot(tangentCrossA2, tangentFactorA2) + Vec3.dot(tangentCrossB2, tangentFactorB2);

    const relativeVelocity = this.getRelativeVelocityAtContact(bodyA, bodyB, rA, rB);
    const normalVelocity = Vec3.dot(relativeVelocity, contact.normal);

    let velocityBias = 0;
    if (normalVelocity < -1.0) {
      velocityBias = -contact.restitution * normalVelocity;
    }

    const positionError = Math.max(contact.penetration - this.penetrationSlop, 0);
    const positionBias = (this.baumgarteStabilization / deltaTime) * positionError;

    return {
      bodyA,
      bodyB,
      contact,
      normalMass: normalMass > 0 ? 1 / normalMass : 0,
      tangentMass: { x: tangentMass1 > 0 ? 1 / tangentMass1 : 0, y: tangentMass2 > 0 ? 1 / tangentMass2 : 0, z: 0 },
      velocityBias,
      positionBias
    };
  }

  private getTangentVector(normal: Vector3D): Vector3D {
    if (Math.abs(normal.x) > Math.abs(normal.y)) {
      return Vec3.normalize({ x: -normal.z, y: 0, z: normal.x });
    } else {
      return Vec3.normalize({ x: 0, y: normal.z, z: -normal.y });
    }
  }

  private getRelativeVelocityAtContact(bodyA: RigidBody, bodyB: RigidBody, rA: Vector3D, rB: Vector3D): Vector3D {
    const velA = Vec3.add(bodyA.state.linearVelocity, Vec3.cross(bodyA.state.angularVelocity, rA));
    const velB = Vec3.add(bodyB.state.linearVelocity, Vec3.cross(bodyB.state.angularVelocity, rB));

    return Vec3.subtract(velB, velA);
  }

  public prepareJoints(joints: Joint[], bodies: Map<string, RigidBody>, deltaTime: number): void {
    this.jointConstraints = [];

    for (const joint of joints) {
      if (joint.isBroken) continue;

      const bodyA = bodies.get(joint.bodyA);
      const bodyB = bodies.get(joint.bodyB);

      if (!bodyA || !bodyB) continue;

      const constraint = this.createJointConstraint(joint, bodyA, bodyB, deltaTime);
      if (constraint) {
        this.jointConstraints.push(constraint);
      }
    }
  }

  private createJointConstraint(joint: Joint, bodyA: RigidBody, bodyB: RigidBody, deltaTime: number): JointConstraint | null {
    switch (joint.type) {
      case JointType.FIXED:
        return this.createFixedJointConstraint(joint, bodyA, bodyB, deltaTime);
      case JointType.REVOLUTE:
        return this.createRevoluteJointConstraint(joint, bodyA, bodyB, deltaTime);
      case JointType.PRISMATIC:
        return this.createPrismaticJointConstraint(joint, bodyA, bodyB, deltaTime);
      default:
        return null;
    }
  }

  private createFixedJointConstraint(joint: Joint, bodyA: RigidBody, bodyB: RigidBody, deltaTime: number): JointConstraint {
    const rA = Vec3.subtract(joint.anchorA, bodyA.state.position);
    const rB = Vec3.subtract(joint.anchorB, bodyB.state.position);

    const jacobian = [
      1, 0, 0, rA.y, -rA.x, 0,
      -1, 0, 0, -rB.y, rB.x, 0
    ];

    const posA = Vec3.add(bodyA.state.position, rA);
    const posB = Vec3.add(bodyB.state.position, rB);
    const error = Vec3.subtract(posB, posA);
    const bias = (this.baumgarteStabilization / deltaTime) * Vec3.magnitude(error);

    const effectiveMass = this.calculateEffectiveMass(jacobian, bodyA, bodyB);

    return {
      joint,
      bodyA,
      bodyB,
      jacobian,
      bias,
      effectiveMass,
      impulse: 0
    };
  }

  private createRevoluteJointConstraint(joint: Joint, bodyA: RigidBody, bodyB: RigidBody, deltaTime: number): JointConstraint {
    const rA = Vec3.subtract(joint.anchorA, bodyA.state.position);
    const rB = Vec3.subtract(joint.anchorB, bodyB.state.position);

    const jacobian = [
      1, 0, 0, rA.y, -rA.x, 0,
      -1, 0, 0, -rB.y, rB.x, 0
    ];

    const posA = Vec3.add(bodyA.state.position, rA);
    const posB = Vec3.add(bodyB.state.position, rB);
    const error = Vec3.subtract(posB, posA);
    const bias = (this.baumgarteStabilization / deltaTime) * Vec3.magnitude(error);

    const effectiveMass = this.calculateEffectiveMass(jacobian, bodyA, bodyB);

    return {
      joint,
      bodyA,
      bodyB,
      jacobian,
      bias,
      effectiveMass,
      impulse: 0
    };
  }

  private createPrismaticJointConstraint(joint: Joint, bodyA: RigidBody, bodyB: RigidBody, deltaTime: number): JointConstraint {
    const axis = joint.axis || Vec3.up();
    const rA = Vec3.subtract(joint.anchorA, bodyA.state.position);
    const rB = Vec3.subtract(joint.anchorB, bodyB.state.position);

    const perpendicular1 = this.getTangentVector(axis);
    const perpendicular2 = Vec3.cross(axis, perpendicular1);

    const jacobian = [
      perpendicular1.x, perpendicular1.y, perpendicular1.z,
      Vec3.cross(rA, perpendicular1).x, Vec3.cross(rA, perpendicular1).y, Vec3.cross(rA, perpendicular1).z,
      -perpendicular1.x, -perpendicular1.y, -perpendicular1.z,
      -Vec3.cross(rB, perpendicular1).x, -Vec3.cross(rB, perpendicular1).y, -Vec3.cross(rB, perpendicular1).z
    ];

    const posA = Vec3.add(bodyA.state.position, rA);
    const posB = Vec3.add(bodyB.state.position, rB);
    const displacement = Vec3.subtract(posB, posA);
    const error = Vec3.dot(displacement, perpendicular1);
    const bias = (this.baumgarteStabilization / deltaTime) * Math.abs(error);

    const effectiveMass = this.calculateEffectiveMass(jacobian, bodyA, bodyB);

    return {
      joint,
      bodyA,
      bodyB,
      jacobian,
      bias,
      effectiveMass,
      impulse: 0
    };
  }

  private calculateEffectiveMass(jacobian: number[], bodyA: RigidBody, bodyB: RigidBody): number {
    let mass = 0;

    mass += bodyA.state.inverseMass * (jacobian[0] * jacobian[0] + jacobian[1] * jacobian[1] + jacobian[2] * jacobian[2]);
    mass += bodyB.state.inverseMass * (jacobian[6] * jacobian[6] + jacobian[7] * jacobian[7] + jacobian[8] * jacobian[8]);

    const angularA = { x: jacobian[3], y: jacobian[4], z: jacobian[5] };
    const angularB = { x: jacobian[9], y: jacobian[10], z: jacobian[11] };

    const angularFactorA = Mat3.multiplyVector(bodyA.state.inverseInertiaTensor, angularA);
    const angularFactorB = Mat3.multiplyVector(bodyB.state.inverseInertiaTensor, angularB);

    mass += Vec3.dot(angularA, angularFactorA);
    mass += Vec3.dot(angularB, angularFactorB);

    return mass > 0 ? 1 / mass : 0;
  }

  public solveVelocityConstraints(): void {
    for (let iteration = 0; iteration < this.iterations; iteration++) {
      this.solveContactConstraints();
      this.solveJointConstraints();
    }
  }

  private solveContactConstraints(): void {
    for (const constraint of this.contactConstraints) {
      this.solveContactConstraint(constraint);
    }
  }

  private solveContactConstraint(constraint: ContactConstraint): void {
    const { bodyA, bodyB, contact } = constraint;

    const rA = Vec3.subtract(contact.pointA, bodyA.state.position);
    const rB = Vec3.subtract(contact.pointB, bodyB.state.position);

    const relativeVelocity = this.getRelativeVelocityAtContact(bodyA, bodyB, rA, rB);
    const normalVelocity = Vec3.dot(relativeVelocity, contact.normal);

    const lambda = -constraint.normalMass * (normalVelocity + constraint.velocityBias + constraint.positionBias);
    const oldImpulse = contact.impulse;
    contact.impulse = Math.max(oldImpulse + lambda, 0);
    const deltaImpulse = contact.impulse - oldImpulse;

    const impulseVector = Vec3.multiply(contact.normal, deltaImpulse);

    this.applyImpulse(bodyA, Vec3.multiply(impulseVector, -1), rA);
    this.applyImpulse(bodyB, impulseVector, rB);

    const tangent1 = this.getTangentVector(contact.normal);
    const tangent2 = Vec3.cross(contact.normal, tangent1);

    const tangentVelocity1 = Vec3.dot(relativeVelocity, tangent1);
    const tangentVelocity2 = Vec3.dot(relativeVelocity, tangent2);

    const maxFriction = contact.friction * contact.impulse;

    let tangentLambda1 = -constraint.tangentMass.x * tangentVelocity1;
    const oldTangentImpulse1 = contact.tangentImpulse.x;
    contact.tangentImpulse.x = Math.max(-maxFriction, Math.min(maxFriction, oldTangentImpulse1 + tangentLambda1));
    tangentLambda1 = contact.tangentImpulse.x - oldTangentImpulse1;

    let tangentLambda2 = -constraint.tangentMass.y * tangentVelocity2;
    const oldTangentImpulse2 = contact.tangentImpulse.y;
    contact.tangentImpulse.y = Math.max(-maxFriction, Math.min(maxFriction, oldTangentImpulse2 + tangentLambda2));
    tangentLambda2 = contact.tangentImpulse.y - oldTangentImpulse2;

    const tangentImpulse1 = Vec3.multiply(tangent1, tangentLambda1);
    const tangentImpulse2 = Vec3.multiply(tangent2, tangentLambda2);

    this.applyImpulse(bodyA, Vec3.multiply(tangentImpulse1, -1), rA);
    this.applyImpulse(bodyB, tangentImpulse1, rB);
    this.applyImpulse(bodyA, Vec3.multiply(tangentImpulse2, -1), rA);
    this.applyImpulse(bodyB, tangentImpulse2, rB);
  }

  private solveJointConstraints(): void {
    for (const constraint of this.jointConstraints) {
      this.solveJointConstraint(constraint);
    }
  }

  private solveJointConstraint(constraint: JointConstraint): void {
    const { bodyA, bodyB, jacobian, effectiveMass, bias } = constraint;

    const jv = this.calculateJacobianTimesVelocity(jacobian, bodyA, bodyB);
    const lambda = -effectiveMass * (jv + bias);

    constraint.impulse += lambda;

    const impulseA = [
      jacobian[0] * lambda,
      jacobian[1] * lambda,
      jacobian[2] * lambda
    ];

    const angularImpulseA = [
      jacobian[3] * lambda,
      jacobian[4] * lambda,
      jacobian[5] * lambda
    ];

    const impulseB = [
      jacobian[6] * lambda,
      jacobian[7] * lambda,
      jacobian[8] * lambda
    ];

    const angularImpulseB = [
      jacobian[9] * lambda,
      jacobian[10] * lambda,
      jacobian[11] * lambda
    ];

    bodyA.state.linearVelocity = Vec3.add(bodyA.state.linearVelocity,
      Vec3.multiply({ x: impulseA[0], y: impulseA[1], z: impulseA[2] }, bodyA.state.inverseMass));

    bodyA.state.angularVelocity = Vec3.add(bodyA.state.angularVelocity,
      Mat3.multiplyVector(bodyA.state.inverseInertiaTensor, { x: angularImpulseA[0], y: angularImpulseA[1], z: angularImpulseA[2] }));

    bodyB.state.linearVelocity = Vec3.add(bodyB.state.linearVelocity,
      Vec3.multiply({ x: impulseB[0], y: impulseB[1], z: impulseB[2] }, bodyB.state.inverseMass));

    bodyB.state.angularVelocity = Vec3.add(bodyB.state.angularVelocity,
      Mat3.multiplyVector(bodyB.state.inverseInertiaTensor, { x: angularImpulseB[0], y: angularImpulseB[1], z: angularImpulseB[2] }));
  }

  private calculateJacobianTimesVelocity(jacobian: number[], bodyA: RigidBody, bodyB: RigidBody): number {
    return jacobian[0] * bodyA.state.linearVelocity.x +
           jacobian[1] * bodyA.state.linearVelocity.y +
           jacobian[2] * bodyA.state.linearVelocity.z +
           jacobian[3] * bodyA.state.angularVelocity.x +
           jacobian[4] * bodyA.state.angularVelocity.y +
           jacobian[5] * bodyA.state.angularVelocity.z +
           jacobian[6] * bodyB.state.linearVelocity.x +
           jacobian[7] * bodyB.state.linearVelocity.y +
           jacobian[8] * bodyB.state.linearVelocity.z +
           jacobian[9] * bodyB.state.angularVelocity.x +
           jacobian[10] * bodyB.state.angularVelocity.y +
           jacobian[11] * bodyB.state.angularVelocity.z;
  }

  private applyImpulse(body: RigidBody, impulse: Vector3D, contactPoint: Vector3D): void {
    if (body.state.isStatic) return;

    body.state.linearVelocity = Vec3.add(body.state.linearVelocity, Vec3.multiply(impulse, body.state.inverseMass));

    const angularImpulse = Vec3.cross(contactPoint, impulse);
    const deltaAngularVelocity = Mat3.multiplyVector(body.state.inverseInertiaTensor, angularImpulse);
    body.state.angularVelocity = Vec3.add(body.state.angularVelocity, deltaAngularVelocity);

    body.wakeUp();
  }

  public clear(): void {
    this.contactConstraints = [];
    this.jointConstraints = [];
  }
}

export class ImpulseSolver {
  private restitutionThreshold: number = 1.0;
  private frictionMixing: number = 0.5;

  public setRestitutionThreshold(threshold: number): void {
    this.restitutionThreshold = threshold;
  }

  public setFrictionMixing(mixing: number): void {
    this.frictionMixing = mixing;
  }

  public resolveCollision(manifold: ContactManifold, bodies: Map<string, RigidBody>): void {
    const bodyA = bodies.get(manifold.bodyA);
    const bodyB = bodies.get(manifold.bodyB);

    if (!bodyA || !bodyB) return;
    if (bodyA.state.isStatic && bodyB.state.isStatic) return;

    for (const contact of manifold.contacts) {
      this.resolveContact(contact, bodyA, bodyB);
    }
  }

  private resolveContact(contact: Contact, bodyA: RigidBody, bodyB: RigidBody): void {
    const rA = Vec3.subtract(contact.pointA, bodyA.state.position);
    const rB = Vec3.subtract(contact.pointB, bodyB.state.position);

    const relativeVelocity = this.getRelativeVelocityAtContact(bodyA, bodyB, rA, rB);
    const separatingVelocity = Vec3.dot(relativeVelocity, contact.normal);

    if (separatingVelocity >= 0) return;

    const totalInverseMass = bodyA.state.inverseMass + bodyB.state.inverseMass;
    if (totalInverseMass === 0) return;

    const crossA = Vec3.cross(rA, contact.normal);
    const crossB = Vec3.cross(rB, contact.normal);

    const angularFactorA = Mat3.multiplyVector(bodyA.state.inverseInertiaTensor, crossA);
    const angularFactorB = Mat3.multiplyVector(bodyB.state.inverseInertiaTensor, crossB);

    const angularEffect = Vec3.dot(crossA, angularFactorA) + Vec3.dot(crossB, angularFactorB);
    const totalMass = totalInverseMass + angularEffect;

    let restitution = contact.restitution;
    if (Math.abs(separatingVelocity) < this.restitutionThreshold) {
      restitution = 0;
    }

    const impulseScalar = -(1 + restitution) * separatingVelocity / totalMass;
    const impulse = Vec3.multiply(contact.normal, impulseScalar);

    bodyA.applyImpulseAtPosition(Vec3.multiply(impulse, -1), contact.pointA);
    bodyB.applyImpulseAtPosition(impulse, contact.pointB);

    this.resolveFriction(contact, bodyA, bodyB, rA, rB, impulseScalar);
  }

  private resolveFriction(contact: Contact, bodyA: RigidBody, bodyB: RigidBody, rA: Vector3D, rB: Vector3D, normalImpulse: number): void {
    const relativeVelocity = this.getRelativeVelocityAtContact(bodyA, bodyB, rA, rB);
    const normalVelocity = Vec3.multiply(contact.normal, Vec3.dot(relativeVelocity, contact.normal));
    const tangentVelocity = Vec3.subtract(relativeVelocity, normalVelocity);

    const tangentSpeed = Vec3.magnitude(tangentVelocity);
    if (tangentSpeed < 1e-6) return;

    const tangentDirection = Vec3.normalize(tangentVelocity);

    const totalInverseMass = bodyA.state.inverseMass + bodyB.state.inverseMass;
    const crossA = Vec3.cross(rA, tangentDirection);
    const crossB = Vec3.cross(rB, tangentDirection);

    const angularFactorA = Mat3.multiplyVector(bodyA.state.inverseInertiaTensor, crossA);
    const angularFactorB = Mat3.multiplyVector(bodyB.state.inverseInertiaTensor, crossB);

    const angularEffect = Vec3.dot(crossA, angularFactorA) + Vec3.dot(crossB, angularFactorB);
    const totalMass = totalInverseMass + angularEffect;

    let frictionImpulse = -tangentSpeed / totalMass;
    const maxFriction = contact.friction * Math.abs(normalImpulse);

    if (Math.abs(frictionImpulse) > maxFriction) {
      frictionImpulse = frictionImpulse > 0 ? maxFriction : -maxFriction;
    }

    const frictionVector = Vec3.multiply(tangentDirection, frictionImpulse);

    bodyA.applyImpulseAtPosition(Vec3.multiply(frictionVector, -1), contact.pointA);
    bodyB.applyImpulseAtPosition(frictionVector, contact.pointB);
  }

  private getRelativeVelocityAtContact(bodyA: RigidBody, bodyB: RigidBody, rA: Vector3D, rB: Vector3D): Vector3D {
    const velA = Vec3.add(bodyA.state.linearVelocity, Vec3.cross(bodyA.state.angularVelocity, rA));
    const velB = Vec3.add(bodyB.state.linearVelocity, Vec3.cross(bodyB.state.angularVelocity, rB));

    return Vec3.subtract(velB, velA);
  }
}
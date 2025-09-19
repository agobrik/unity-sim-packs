import {
  Vector3D,
  AABB,
  Sphere,
  Ray,
  RaycastResult,
  Contact,
  ContactManifold,
  CollisionShape,
  ShapeType,
  BoxShape,
  SphereShape,
  CylinderShape,
  Plane,
  PhysicsQuery,
  QueryType,
  QueryResult
} from './types';
import { Vec3 } from './math';
import { RigidBody } from './bodies';

export class CollisionDetection {
  public static testAABBAABB(a: AABB, b: AABB): boolean {
    return (
      a.min.x <= b.max.x && a.max.x >= b.min.x &&
      a.min.y <= b.max.y && a.max.y >= b.min.y &&
      a.min.z <= b.max.z && a.max.z >= b.min.z
    );
  }

  public static testSphereSphere(a: Sphere, b: Sphere): boolean {
    const distance = Vec3.distance(a.center, b.center);
    return distance <= (a.radius + b.radius);
  }

  public static testSphereAABB(sphere: Sphere, aabb: AABB): boolean {
    const closestPoint = this.closestPointOnAABB(sphere.center, aabb);
    const distance = Vec3.distance(sphere.center, closestPoint);
    return distance <= sphere.radius;
  }

  public static closestPointOnAABB(point: Vector3D, aabb: AABB): Vector3D {
    return {
      x: Math.max(aabb.min.x, Math.min(aabb.max.x, point.x)),
      y: Math.max(aabb.min.y, Math.min(aabb.max.y, point.y)),
      z: Math.max(aabb.min.z, Math.min(aabb.max.z, point.z))
    };
  }

  public static raycastAABB(ray: Ray, aabb: AABB): RaycastResult {
    const invDir = {
      x: 1 / ray.direction.x,
      y: 1 / ray.direction.y,
      z: 1 / ray.direction.z
    };

    const t1 = (aabb.min.x - ray.origin.x) * invDir.x;
    const t2 = (aabb.max.x - ray.origin.x) * invDir.x;
    const t3 = (aabb.min.y - ray.origin.y) * invDir.y;
    const t4 = (aabb.max.y - ray.origin.y) * invDir.y;
    const t5 = (aabb.min.z - ray.origin.z) * invDir.z;
    const t6 = (aabb.max.z - ray.origin.z) * invDir.z;

    const tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
    const tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));

    if (tmax < 0 || tmin > tmax) {
      return { hit: false };
    }

    const t = tmin < 0 ? tmax : tmin;
    const hitPoint = Vec3.add(ray.origin, Vec3.multiply(ray.direction, t));

    let normal = Vec3.zero();
    const center = Vec3.multiply(Vec3.add(aabb.min, aabb.max), 0.5);
    const extent = Vec3.multiply(Vec3.subtract(aabb.max, aabb.min), 0.5);
    const localHit = Vec3.subtract(hitPoint, center);

    const bias = 1.01;
    if (Math.abs(localHit.x) > Math.abs(localHit.y) && Math.abs(localHit.x) > Math.abs(localHit.z)) {
      normal.x = localHit.x > 0 ? 1 : -1;
    } else if (Math.abs(localHit.y) > Math.abs(localHit.z)) {
      normal.y = localHit.y > 0 ? 1 : -1;
    } else {
      normal.z = localHit.z > 0 ? 1 : -1;
    }

    return {
      hit: true,
      point: hitPoint,
      normal,
      distance: t
    };
  }

  public static raycastSphere(ray: Ray, sphere: Sphere): RaycastResult {
    const oc = Vec3.subtract(ray.origin, sphere.center);
    const a = Vec3.dot(ray.direction, ray.direction);
    const b = 2 * Vec3.dot(oc, ray.direction);
    const c = Vec3.dot(oc, oc) - sphere.radius * sphere.radius;

    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return { hit: false };
    }

    const t = (-b - Math.sqrt(discriminant)) / (2 * a);

    if (t < 0) {
      return { hit: false };
    }

    const hitPoint = Vec3.add(ray.origin, Vec3.multiply(ray.direction, t));
    const normal = Vec3.normalize(Vec3.subtract(hitPoint, sphere.center));

    return {
      hit: true,
      point: hitPoint,
      normal,
      distance: t
    };
  }

  public static raycastPlane(ray: Ray, plane: Plane): RaycastResult {
    const denom = Vec3.dot(plane.normal, ray.direction);

    if (Math.abs(denom) < 1e-6) {
      return { hit: false };
    }

    const t = (plane.distance - Vec3.dot(plane.normal, ray.origin)) / denom;

    if (t < 0) {
      return { hit: false };
    }

    const hitPoint = Vec3.add(ray.origin, Vec3.multiply(ray.direction, t));

    return {
      hit: true,
      point: hitPoint,
      normal: plane.normal,
      distance: t
    };
  }
}

export class NarrowPhase {
  public static generateContacts(bodyA: RigidBody, bodyB: RigidBody): ContactManifold | null {
    const shapeA = bodyA.shape;
    const shapeB = bodyB.shape;

    if (shapeA.type === ShapeType.SPHERE && shapeB.type === ShapeType.SPHERE) {
      return this.sphereVsSphere(bodyA, bodyB);
    }

    if (shapeA.type === ShapeType.SPHERE && shapeB.type === ShapeType.BOX) {
      return this.sphereVsBox(bodyA, bodyB);
    }

    if (shapeA.type === ShapeType.BOX && shapeB.type === ShapeType.SPHERE) {
      const result = this.sphereVsBox(bodyB, bodyA);
      if (result) {
        result.bodyA = bodyA.id;
        result.bodyB = bodyB.id;
        result.contacts.forEach(contact => {
          const temp = contact.pointA;
          contact.pointA = contact.pointB;
          contact.pointB = temp;
          contact.normal = Vec3.multiply(contact.normal, -1);
        });
      }
      return result;
    }

    if (shapeA.type === ShapeType.BOX && shapeB.type === ShapeType.BOX) {
      return this.boxVsBox(bodyA, bodyB);
    }

    return null;
  }

  private static sphereVsSphere(bodyA: RigidBody, bodyB: RigidBody): ContactManifold | null {
    const radiusA = bodyA.shape.data.radius;
    const radiusB = bodyB.shape.data.radius;
    const posA = bodyA.state.position;
    const posB = bodyB.state.position;

    const delta = Vec3.subtract(posB, posA);
    const distance = Vec3.magnitude(delta);
    const totalRadius = radiusA + radiusB;

    if (distance >= totalRadius) {
      return null;
    }

    const normal = distance > 0 ? Vec3.normalize(delta) : Vec3.right();
    const penetration = totalRadius - distance;

    const contactPoint = Vec3.add(posA, Vec3.multiply(normal, radiusA - penetration * 0.5));

    const contact: Contact = {
      pointA: Vec3.add(posA, Vec3.multiply(normal, radiusA)),
      pointB: Vec3.subtract(posB, Vec3.multiply(normal, radiusB)),
      normal,
      penetration,
      impulse: 0,
      tangentImpulse: Vec3.zero(),
      restitution: Math.min(bodyA.state.restitution, bodyB.state.restitution),
      friction: Math.sqrt(bodyA.state.friction * bodyB.state.friction)
    };

    return {
      bodyA: bodyA.id,
      bodyB: bodyB.id,
      contacts: [contact],
      friction: contact.friction,
      restitution: contact.restitution,
      isColliding: true
    };
  }

  private static sphereVsBox(sphereBody: RigidBody, boxBody: RigidBody): ContactManifold | null {
    const spherePos = sphereBody.state.position;
    const sphereRadius = sphereBody.shape.data.radius;
    const boxPos = boxBody.state.position;
    const halfExtents = boxBody.shape.data.halfExtents;

    const aabb: AABB = {
      min: Vec3.subtract(boxPos, halfExtents),
      max: Vec3.add(boxPos, halfExtents)
    };

    const closestPoint = CollisionDetection.closestPointOnAABB(spherePos, aabb);
    const delta = Vec3.subtract(spherePos, closestPoint);
    const distance = Vec3.magnitude(delta);

    if (distance >= sphereRadius) {
      return null;
    }

    let normal: Vector3D;
    let penetration: number;

    if (distance > 0) {
      normal = Vec3.normalize(delta);
      penetration = sphereRadius - distance;
    } else {
      const localPos = Vec3.subtract(spherePos, boxPos);
      const dx = halfExtents.x - Math.abs(localPos.x);
      const dy = halfExtents.y - Math.abs(localPos.y);
      const dz = halfExtents.z - Math.abs(localPos.z);

      if (dx < dy && dx < dz) {
        normal = { x: localPos.x > 0 ? 1 : -1, y: 0, z: 0 };
        penetration = sphereRadius + dx;
      } else if (dy < dz) {
        normal = { x: 0, y: localPos.y > 0 ? 1 : -1, z: 0 };
        penetration = sphereRadius + dy;
      } else {
        normal = { x: 0, y: 0, z: localPos.z > 0 ? 1 : -1 };
        penetration = sphereRadius + dz;
      }
    }

    const contact: Contact = {
      pointA: Vec3.subtract(spherePos, Vec3.multiply(normal, sphereRadius)),
      pointB: closestPoint,
      normal,
      penetration,
      impulse: 0,
      tangentImpulse: Vec3.zero(),
      restitution: Math.min(sphereBody.state.restitution, boxBody.state.restitution),
      friction: Math.sqrt(sphereBody.state.friction * boxBody.state.friction)
    };

    return {
      bodyA: sphereBody.id,
      bodyB: boxBody.id,
      contacts: [contact],
      friction: contact.friction,
      restitution: contact.restitution,
      isColliding: true
    };
  }

  private static boxVsBox(bodyA: RigidBody, bodyB: RigidBody): ContactManifold | null {
    const posA = bodyA.state.position;
    const posB = bodyB.state.position;
    const halfExtentsA = bodyA.shape.data.halfExtents;
    const halfExtentsB = bodyB.shape.data.halfExtents;

    const delta = Vec3.subtract(posB, posA);
    const overlap = Vec3.subtract(
      Vec3.add(halfExtentsA, halfExtentsB),
      {
        x: Math.abs(delta.x),
        y: Math.abs(delta.y),
        z: Math.abs(delta.z)
      }
    );

    if (overlap.x <= 0 || overlap.y <= 0 || overlap.z <= 0) {
      return null;
    }

    let normal: Vector3D;
    let penetration: number;

    if (overlap.x < overlap.y && overlap.x < overlap.z) {
      normal = { x: delta.x > 0 ? 1 : -1, y: 0, z: 0 };
      penetration = overlap.x;
    } else if (overlap.y < overlap.z) {
      normal = { x: 0, y: delta.y > 0 ? 1 : -1, z: 0 };
      penetration = overlap.y;
    } else {
      normal = { x: 0, y: 0, z: delta.z > 0 ? 1 : -1 };
      penetration = overlap.z;
    }

    const contactPointA = Vec3.add(posA, {
      x: normal.x > 0 ? halfExtentsA.x : -halfExtentsA.x,
      y: normal.y > 0 ? halfExtentsA.y : -halfExtentsA.y,
      z: normal.z > 0 ? halfExtentsA.z : -halfExtentsA.z
    });

    const contactPointB = Vec3.subtract(posB, {
      x: normal.x > 0 ? halfExtentsB.x : -halfExtentsB.x,
      y: normal.y > 0 ? halfExtentsB.y : -halfExtentsB.y,
      z: normal.z > 0 ? halfExtentsB.z : -halfExtentsB.z
    });

    const contact: Contact = {
      pointA: contactPointA,
      pointB: contactPointB,
      normal,
      penetration,
      impulse: 0,
      tangentImpulse: Vec3.zero(),
      restitution: Math.min(bodyA.state.restitution, bodyB.state.restitution),
      friction: Math.sqrt(bodyA.state.friction * bodyB.state.friction)
    };

    return {
      bodyA: bodyA.id,
      bodyB: bodyB.id,
      contacts: [contact],
      friction: contact.friction,
      restitution: contact.restitution,
      isColliding: true
    };
  }
}

export class BroadPhase {
  private aabbs: Map<string, AABB> = new Map();

  public updateAABB(bodyId: string, aabb: AABB): void {
    this.aabbs.set(bodyId, aabb);
  }

  public removeAABB(bodyId: string): void {
    this.aabbs.delete(bodyId);
  }

  public getAABB(bodyId: string): AABB | undefined {
    return this.aabbs.get(bodyId);
  }

  public detectBroadPhaseCollisions(): Array<[string, string]> {
    const pairs: Array<[string, string]> = [];
    const bodies = Array.from(this.aabbs.keys());

    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const bodyA = bodies[i];
        const bodyB = bodies[j];
        const aabbA = this.aabbs.get(bodyA)!;
        const aabbB = this.aabbs.get(bodyB)!;

        if (CollisionDetection.testAABBAABB(aabbA, aabbB)) {
          pairs.push([bodyA, bodyB]);
        }
      }
    }

    return pairs;
  }

  public query(query: PhysicsQuery): QueryResult[] {
    const results: QueryResult[] = [];

    switch (query.type) {
      case QueryType.RAYCAST:
        if (query.ray) {
          results.push(...this.raycast(query.ray, query.maxResults));
        }
        break;

      case QueryType.OVERLAP:
        if (query.shape && query.position) {
          results.push(...this.overlapQuery(query.shape, query.position, query.maxResults));
        }
        break;
    }

    return results;
  }

  private raycast(ray: Ray, maxResults: number = Infinity): QueryResult[] {
    const results: QueryResult[] = [];

    for (const [bodyId, aabb] of this.aabbs) {
      const result = CollisionDetection.raycastAABB(ray, aabb);
      if (result.hit && result.point && result.normal && result.distance !== undefined) {
        results.push({
          body: bodyId,
          point: result.point,
          normal: result.normal,
          distance: result.distance,
          fraction: result.distance / Vec3.magnitude(ray.direction)
        });
      }

      if (results.length >= maxResults) break;
    }

    return results.sort((a, b) => a.distance - b.distance);
  }

  private overlapQuery(shape: CollisionShape, position: Vector3D, maxResults: number = Infinity): QueryResult[] {
    const results: QueryResult[] = [];

    if (shape.type === ShapeType.SPHERE) {
      const sphere: Sphere = {
        center: position,
        radius: shape.data.radius
      };

      for (const [bodyId, aabb] of this.aabbs) {
        if (CollisionDetection.testSphereAABB(sphere, aabb)) {
          const closestPoint = CollisionDetection.closestPointOnAABB(position, aabb);
          const distance = Vec3.distance(position, closestPoint);
          const normal = Vec3.normalize(Vec3.subtract(position, closestPoint));

          results.push({
            body: bodyId,
            point: closestPoint,
            normal,
            distance,
            fraction: distance / shape.data.radius
          });
        }

        if (results.length >= maxResults) break;
      }
    }

    return results.sort((a, b) => a.distance - b.distance);
  }

  public clear(): void {
    this.aabbs.clear();
  }
}

export class CollisionWorld {
  private broadPhase: BroadPhase = new BroadPhase();
  private contacts: Map<string, ContactManifold> = new Map();

  public updateBodyAABB(body: RigidBody): void {
    const aabb = this.calculateAABB(body);
    this.broadPhase.updateAABB(body.id, aabb);
  }

  private calculateAABB(body: RigidBody): AABB {
    const position = body.state.position;
    const shape = body.shape;

    switch (shape.type) {
      case ShapeType.SPHERE: {
        const radius = shape.data.radius;
        return {
          min: Vec3.subtract(position, { x: radius, y: radius, z: radius }),
          max: Vec3.add(position, { x: radius, y: radius, z: radius })
        };
      }

      case ShapeType.BOX: {
        const halfExtents = shape.data.halfExtents;
        return {
          min: Vec3.subtract(position, halfExtents),
          max: Vec3.add(position, halfExtents)
        };
      }

      default:
        return {
          min: Vec3.subtract(position, { x: 1, y: 1, z: 1 }),
          max: Vec3.add(position, { x: 1, y: 1, z: 1 })
        };
    }
  }

  public detectCollisions(bodies: Map<string, RigidBody>): ContactManifold[] {
    this.contacts.clear();

    const broadPhasePairs = this.broadPhase.detectBroadPhaseCollisions();
    const manifolds: ContactManifold[] = [];

    for (const [idA, idB] of broadPhasePairs) {
      const bodyA = bodies.get(idA);
      const bodyB = bodies.get(idB);

      if (!bodyA || !bodyB) continue;

      const manifold = NarrowPhase.generateContacts(bodyA, bodyB);
      if (manifold) {
        const contactKey = this.getContactKey(idA, idB);
        this.contacts.set(contactKey, manifold);
        manifolds.push(manifold);
      }
    }

    return manifolds;
  }

  private getContactKey(idA: string, idB: string): string {
    return idA < idB ? `${idA}_${idB}` : `${idB}_${idA}`;
  }

  public removeBody(bodyId: string): void {
    this.broadPhase.removeAABB(bodyId);

    const keysToDelete: string[] = [];
    for (const key of this.contacts.keys()) {
      if (key.includes(bodyId)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.contacts.delete(key);
    }
  }

  public raycast(ray: Ray, maxResults: number = 1): QueryResult[] {
    const query: PhysicsQuery = {
      type: QueryType.RAYCAST,
      ray,
      maxResults
    };

    return this.broadPhase.query(query);
  }

  public overlapTest(shape: CollisionShape, position: Vector3D, maxResults: number = Infinity): QueryResult[] {
    const query: PhysicsQuery = {
      type: QueryType.OVERLAP,
      shape,
      position,
      maxResults
    };

    return this.broadPhase.query(query);
  }

  public getContact(idA: string, idB: string): ContactManifold | undefined {
    const key = this.getContactKey(idA, idB);
    return this.contacts.get(key);
  }

  public getAllContacts(): ContactManifold[] {
    return Array.from(this.contacts.values());
  }

  public clear(): void {
    this.broadPhase.clear();
    this.contacts.clear();
  }
}
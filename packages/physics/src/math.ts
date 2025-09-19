import { Vector2D, Vector3D, Quaternion, Matrix3x3, Matrix4x4 } from './types';

export class Vec2 {
  static zero(): Vector2D {
    return { x: 0, y: 0 };
  }

  static one(): Vector2D {
    return { x: 1, y: 1 };
  }

  static add(a: Vector2D, b: Vector2D): Vector2D {
    return { x: a.x + b.x, y: a.y + b.y };
  }

  static subtract(a: Vector2D, b: Vector2D): Vector2D {
    return { x: a.x - b.x, y: a.y - b.y };
  }

  static multiply(v: Vector2D, scalar: number): Vector2D {
    return { x: v.x * scalar, y: v.y * scalar };
  }

  static divide(v: Vector2D, scalar: number): Vector2D {
    return { x: v.x / scalar, y: v.y / scalar };
  }

  static dot(a: Vector2D, b: Vector2D): number {
    return a.x * b.x + a.y * b.y;
  }

  static cross(a: Vector2D, b: Vector2D): number {
    return a.x * b.y - a.y * b.x;
  }

  static magnitude(v: Vector2D): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }

  static lengthSquared(v: Vector2D): number {
    return v.x * v.x + v.y * v.y;
  }

  static normalize(v: Vector2D): Vector2D {
    const len = Vec2.magnitude(v);
    if (len === 0) return Vec2.zero();
    return Vec2.divide(v, len);
  }

  static distance(a: Vector2D, b: Vector2D): number {
    return Vec2.magnitude(Vec2.subtract(a, b));
  }

  static distanceSquared(a: Vector2D, b: Vector2D): number {
    const diff = Vec2.subtract(a, b);
    return Vec2.lengthSquared(diff);
  }

  static lerp(a: Vector2D, b: Vector2D, t: number): Vector2D {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t
    };
  }

  static angle(a: Vector2D, b: Vector2D): number {
    return Math.atan2(Vec2.cross(a, b), Vec2.dot(a, b));
  }

  static rotate(v: Vector2D, angle: number): Vector2D {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos
    };
  }
}

export class Vec3 {
  static zero(): Vector3D {
    return { x: 0, y: 0, z: 0 };
  }

  static one(): Vector3D {
    return { x: 1, y: 1, z: 1 };
  }

  static up(): Vector3D {
    return { x: 0, y: 1, z: 0 };
  }

  static down(): Vector3D {
    return { x: 0, y: -1, z: 0 };
  }

  static left(): Vector3D {
    return { x: -1, y: 0, z: 0 };
  }

  static right(): Vector3D {
    return { x: 1, y: 0, z: 0 };
  }

  static forward(): Vector3D {
    return { x: 0, y: 0, z: 1 };
  }

  static back(): Vector3D {
    return { x: 0, y: 0, z: -1 };
  }

  static add(a: Vector3D, b: Vector3D): Vector3D {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  static subtract(a: Vector3D, b: Vector3D): Vector3D {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  static multiply(v: Vector3D, scalar: number): Vector3D {
    return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
  }

  static divide(v: Vector3D, scalar: number): Vector3D {
    return { x: v.x / scalar, y: v.y / scalar, z: v.z / scalar };
  }

  static dot(a: Vector3D, b: Vector3D): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  static cross(a: Vector3D, b: Vector3D): Vector3D {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }

  static magnitude(v: Vector3D): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  static lengthSquared(v: Vector3D): number {
    return v.x * v.x + v.y * v.y + v.z * v.z;
  }

  static normalize(v: Vector3D): Vector3D {
    const len = Vec3.magnitude(v);
    if (len === 0) return Vec3.zero();
    return Vec3.divide(v, len);
  }

  static distance(a: Vector3D, b: Vector3D): number {
    return Vec3.magnitude(Vec3.subtract(a, b));
  }

  static distanceSquared(a: Vector3D, b: Vector3D): number {
    const diff = Vec3.subtract(a, b);
    return Vec3.lengthSquared(diff);
  }

  static lerp(a: Vector3D, b: Vector3D, t: number): Vector3D {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t
    };
  }

  static slerp(a: Vector3D, b: Vector3D, t: number): Vector3D {
    const dot = Vec3.dot(Vec3.normalize(a), Vec3.normalize(b));
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

    if (angle < 1e-6) {
      return Vec3.lerp(a, b, t);
    }

    const sinAngle = Math.sin(angle);
    const ratioA = Math.sin((1 - t) * angle) / sinAngle;
    const ratioB = Math.sin(t * angle) / sinAngle;

    return Vec3.add(Vec3.multiply(a, ratioA), Vec3.multiply(b, ratioB));
  }

  static angle(a: Vector3D, b: Vector3D): number {
    const dot = Vec3.dot(Vec3.normalize(a), Vec3.normalize(b));
    return Math.acos(Math.max(-1, Math.min(1, dot)));
  }

  static project(vector: Vector3D, onto: Vector3D): Vector3D {
    const dot = Vec3.dot(vector, onto);
    const lenSq = Vec3.lengthSquared(onto);
    if (lenSq === 0) return Vec3.zero();
    return Vec3.multiply(onto, dot / lenSq);
  }

  static reject(vector: Vector3D, onto: Vector3D): Vector3D {
    return Vec3.subtract(vector, Vec3.project(vector, onto));
  }

  static reflect(vector: Vector3D, normal: Vector3D): Vector3D {
    return Vec3.subtract(vector, Vec3.multiply(normal, 2 * Vec3.dot(vector, normal)));
  }

  static clamp(v: Vector3D, min: Vector3D, max: Vector3D): Vector3D {
    return {
      x: Math.max(min.x, Math.min(max.x, v.x)),
      y: Math.max(min.y, Math.min(max.y, v.y)),
      z: Math.max(min.z, Math.min(max.z, v.z))
    };
  }
}

export class Quat {
  static identity(): Quaternion {
    return { x: 0, y: 0, z: 0, w: 1 };
  }

  static fromAxisAngle(axis: Vector3D, angle: number): Quaternion {
    const normalizedAxis = Vec3.normalize(axis);
    const halfAngle = angle * 0.5;
    const sin = Math.sin(halfAngle);
    const cos = Math.cos(halfAngle);

    return {
      x: normalizedAxis.x * sin,
      y: normalizedAxis.y * sin,
      z: normalizedAxis.z * sin,
      w: cos
    };
  }

  static fromEuler(x: number, y: number, z: number): Quaternion {
    const cx = Math.cos(x * 0.5);
    const sx = Math.sin(x * 0.5);
    const cy = Math.cos(y * 0.5);
    const sy = Math.sin(y * 0.5);
    const cz = Math.cos(z * 0.5);
    const sz = Math.sin(z * 0.5);

    return {
      x: sx * cy * cz - cx * sy * sz,
      y: cx * sy * cz + sx * cy * sz,
      z: cx * cy * sz - sx * sy * cz,
      w: cx * cy * cz + sx * sy * sz
    };
  }

  static multiply(a: Quaternion, b: Quaternion): Quaternion {
    return {
      x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
      y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
      z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
      w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
    };
  }

  static conjugate(q: Quaternion): Quaternion {
    return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
  }

  static inverse(q: Quaternion): Quaternion {
    const lengthSq = q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w;
    const conjugated = Quat.conjugate(q);

    return {
      x: conjugated.x / lengthSq,
      y: conjugated.y / lengthSq,
      z: conjugated.z / lengthSq,
      w: conjugated.w / lengthSq
    };
  }

  static normalize(q: Quaternion): Quaternion {
    const length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
    if (length === 0) return Quat.identity();

    return {
      x: q.x / length,
      y: q.y / length,
      z: q.z / length,
      w: q.w / length
    };
  }

  static slerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
    let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;

    let q2 = { ...b };
    if (dot < 0) {
      q2.x = -q2.x;
      q2.y = -q2.y;
      q2.z = -q2.z;
      q2.w = -q2.w;
      dot = -dot;
    }

    if (dot > 0.9995) {
      return Quat.normalize({
        x: a.x + t * (q2.x - a.x),
        y: a.y + t * (q2.y - a.y),
        z: a.z + t * (q2.z - a.z),
        w: a.w + t * (q2.w - a.w)
      });
    }

    const theta0 = Math.acos(Math.abs(dot));
    const theta = theta0 * t;
    const sinTheta = Math.sin(theta);
    const sinTheta0 = Math.sin(theta0);

    const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0;
    const s1 = sinTheta / sinTheta0;

    return {
      x: s0 * a.x + s1 * q2.x,
      y: s0 * a.y + s1 * q2.y,
      z: s0 * a.z + s1 * q2.z,
      w: s0 * a.w + s1 * q2.w
    };
  }

  static rotateVector(q: Quaternion, v: Vector3D): Vector3D {
    const qv = { x: q.x, y: q.y, z: q.z };
    const uv = Vec3.cross(qv, v);
    const uuv = Vec3.cross(qv, uv);

    return Vec3.add(v, Vec3.multiply(Vec3.add(Vec3.multiply(uv, 2 * q.w), Vec3.multiply(uuv, 2)), 1));
  }

  static toEuler(q: Quaternion): Vector3D {
    const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
    const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);

    const sinp = 2 * (q.w * q.y - q.z * q.x);
    const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);

    const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
    const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);

    return { x: roll, y: pitch, z: yaw };
  }
}

export class Mat3 {
  static identity(): Matrix3x3 {
    return {
      elements: [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
      ]
    };
  }

  static zero(): Matrix3x3 {
    return {
      elements: new Array(9).fill(0)
    };
  }

  static fromArray(elements: number[]): Matrix3x3 {
    if (elements.length !== 9) {
      throw new Error('Matrix3x3 requires exactly 9 elements');
    }
    return { elements: [...elements] };
  }

  static multiply(a: Matrix3x3, b: Matrix3x3): Matrix3x3 {
    const result = new Array(9);
    const ae = a.elements;
    const be = b.elements;

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        result[i * 3 + j] =
          ae[i * 3 + 0] * be[0 * 3 + j] +
          ae[i * 3 + 1] * be[1 * 3 + j] +
          ae[i * 3 + 2] * be[2 * 3 + j];
      }
    }

    return { elements: result };
  }

  static multiplyVector(m: Matrix3x3, v: Vector3D): Vector3D {
    const e = m.elements;
    return {
      x: e[0] * v.x + e[1] * v.y + e[2] * v.z,
      y: e[3] * v.x + e[4] * v.y + e[5] * v.z,
      z: e[6] * v.x + e[7] * v.y + e[8] * v.z
    };
  }

  static transpose(m: Matrix3x3): Matrix3x3 {
    const e = m.elements;
    return {
      elements: [
        e[0], e[3], e[6],
        e[1], e[4], e[7],
        e[2], e[5], e[8]
      ]
    };
  }

  static determinant(m: Matrix3x3): number {
    const e = m.elements;
    return e[0] * (e[4] * e[8] - e[5] * e[7]) -
           e[1] * (e[3] * e[8] - e[5] * e[6]) +
           e[2] * (e[3] * e[7] - e[4] * e[6]);
  }

  static inverse(m: Matrix3x3): Matrix3x3 {
    const e = m.elements;
    const det = Mat3.determinant(m);

    if (Math.abs(det) < 1e-10) {
      throw new Error('Matrix is not invertible');
    }

    const invDet = 1 / det;

    return {
      elements: [
        (e[4] * e[8] - e[5] * e[7]) * invDet,
        (e[2] * e[7] - e[1] * e[8]) * invDet,
        (e[1] * e[5] - e[2] * e[4]) * invDet,
        (e[5] * e[6] - e[3] * e[8]) * invDet,
        (e[0] * e[8] - e[2] * e[6]) * invDet,
        (e[2] * e[3] - e[0] * e[5]) * invDet,
        (e[3] * e[7] - e[4] * e[6]) * invDet,
        (e[1] * e[6] - e[0] * e[7]) * invDet,
        (e[0] * e[4] - e[1] * e[3]) * invDet
      ]
    };
  }

  static fromQuaternion(q: Quaternion): Matrix3x3 {
    const x = q.x, y = q.y, z = q.z, w = q.w;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;

    return {
      elements: [
        1 - (yy + zz), xy - wz, xz + wy,
        xy + wz, 1 - (xx + zz), yz - wx,
        xz - wy, yz + wx, 1 - (xx + yy)
      ]
    };
  }

  static scale(s: Vector3D): Matrix3x3 {
    return {
      elements: [
        s.x, 0, 0,
        0, s.y, 0,
        0, 0, s.z
      ]
    };
  }
}

export class Mat4 {
  static identity(): Matrix4x4 {
    return {
      elements: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ]
    };
  }

  static zero(): Matrix4x4 {
    return {
      elements: new Array(16).fill(0)
    };
  }

  static fromArray(elements: number[]): Matrix4x4 {
    if (elements.length !== 16) {
      throw new Error('Matrix4x4 requires exactly 16 elements');
    }
    return { elements: [...elements] };
  }

  static multiply(a: Matrix4x4, b: Matrix4x4): Matrix4x4 {
    const result = new Array(16);
    const ae = a.elements;
    const be = b.elements;

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i * 4 + j] =
          ae[i * 4 + 0] * be[0 * 4 + j] +
          ae[i * 4 + 1] * be[1 * 4 + j] +
          ae[i * 4 + 2] * be[2 * 4 + j] +
          ae[i * 4 + 3] * be[3 * 4 + j];
      }
    }

    return { elements: result };
  }

  static translation(v: Vector3D): Matrix4x4 {
    return {
      elements: [
        1, 0, 0, v.x,
        0, 1, 0, v.y,
        0, 0, 1, v.z,
        0, 0, 0, 1
      ]
    };
  }

  static rotation(q: Quaternion): Matrix4x4 {
    const x = q.x, y = q.y, z = q.z, w = q.w;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;

    return {
      elements: [
        1 - (yy + zz), xy - wz, xz + wy, 0,
        xy + wz, 1 - (xx + zz), yz - wx, 0,
        xz - wy, yz + wx, 1 - (xx + yy), 0,
        0, 0, 0, 1
      ]
    };
  }

  static scale(s: Vector3D): Matrix4x4 {
    return {
      elements: [
        s.x, 0, 0, 0,
        0, s.y, 0, 0,
        0, 0, s.z, 0,
        0, 0, 0, 1
      ]
    };
  }

  static compose(position: Vector3D, rotation: Quaternion, scale: Vector3D): Matrix4x4 {
    const t = Mat4.translation(position);
    const r = Mat4.rotation(rotation);
    const s = Mat4.scale(scale);

    return Mat4.multiply(Mat4.multiply(t, r), s);
  }

  static inverse(m: Matrix4x4): Matrix4x4 {
    const e = m.elements;
    const n11 = e[0], n21 = e[1], n31 = e[2], n41 = e[3];
    const n12 = e[4], n22 = e[5], n32 = e[6], n42 = e[7];
    const n13 = e[8], n23 = e[9], n33 = e[10], n43 = e[11];
    const n14 = e[12], n24 = e[13], n34 = e[14], n44 = e[15];

    const t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44;
    const t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44;
    const t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44;
    const t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;

    const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;

    if (det === 0) {
      throw new Error('Matrix is not invertible');
    }

    const detInv = 1 / det;

    return {
      elements: [
        t11 * detInv,
        (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * detInv,
        (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * detInv,
        (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * detInv,
        t12 * detInv,
        (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * detInv,
        (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * detInv,
        (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * detInv,
        t13 * detInv,
        (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * detInv,
        (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * detInv,
        (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * detInv,
        t14 * detInv,
        (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * detInv,
        (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * detInv,
        (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * detInv
      ]
    };
  }
}

export const MathUtils = {
  clamp: (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
  },

  lerp: (a: number, b: number, t: number): number => {
    return a + (b - a) * t;
  },

  smoothstep: (edge0: number, edge1: number, x: number): number => {
    const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  },

  smootherstep: (edge0: number, edge1: number, x: number): number => {
    const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  },

  radToDeg: (rad: number): number => {
    return rad * (180 / Math.PI);
  },

  degToRad: (deg: number): number => {
    return deg * (Math.PI / 180);
  },

  isPowerOfTwo: (n: number): boolean => {
    return (n & (n - 1)) === 0 && n !== 0;
  },

  nextPowerOfTwo: (n: number): number => {
    n--;
    n |= n >> 1;
    n |= n >> 2;
    n |= n >> 4;
    n |= n >> 8;
    n |= n >> 16;
    return n + 1;
  },

  random: (min: number = 0, max: number = 1): number => {
    return min + Math.random() * (max - min);
  },

  randomInt: (min: number, max: number): number => {
    return Math.floor(MathUtils.random(min, max + 1));
  },

  sign: (x: number): number => {
    return x > 0 ? 1 : x < 0 ? -1 : 0;
  },

  fract: (x: number): number => {
    return x - Math.floor(x);
  },

  mod: (x: number, y: number): number => {
    return ((x % y) + y) % y;
  }
};
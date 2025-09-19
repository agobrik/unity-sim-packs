// Advanced noise generation system for procedural content
export interface NoiseConfig {
  seed: number;
  octaves: number;
  persistence: number;
  scale: number;
  lacunarity: number;
  amplitude: number;
  frequency: number;
}

export type NoiseType = 'perlin' | 'simplex' | 'value' | 'worley' | 'ridge' | 'turbulence' | 'billow';

export class NoiseGenerator {
  private seed: number;
  private permutation: number[];
  private permutation12: number[];

  constructor(seed: number = 0) {
    this.seed = seed;
    this.permutation = [];
    this.permutation12 = [];
    this.initializePermutations();
  }

  private initializePermutations(): void {
    const p = [
      151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
      140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
      247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
      57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
      74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
      60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
      65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
      200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
      52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
      207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
      119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
      129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
      218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
      81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
      184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
      222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
    ];

    // Apply seed to permutation table
    const rng = this.createSeededRNG(this.seed);
    for (let i = 0; i < 256; i++) {
      const j = Math.floor(rng() * 256);
      [p[i], p[j]] = [p[j], p[i]];
    }

    this.permutation = new Array(512);
    this.permutation12 = new Array(512);

    for (let i = 0; i < 512; i++) {
      this.permutation[i] = p[i & 255];
      this.permutation12[i] = this.permutation[i] % 12;
    }
  }

  private createSeededRNG(seed: number): () => number {
    let value = seed;
    return () => {
      value = (value * 9301 + 49297) % 233280;
      return value / 233280;
    };
  }

  // 2D Perlin noise
  perlin2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const A = this.permutation[X] + Y;
    const AA = this.permutation[A];
    const AB = this.permutation[A + 1];
    const B = this.permutation[X + 1] + Y;
    const BA = this.permutation[B];
    const BB = this.permutation[B + 1];

    return this.lerp(v,
      this.lerp(u, this.grad2D(this.permutation[AA], x, y),
                   this.grad2D(this.permutation[BA], x - 1, y)),
      this.lerp(u, this.grad2D(this.permutation[AB], x, y - 1),
                   this.grad2D(this.permutation[BB], x - 1, y - 1))
    );
  }

  // 3D Perlin noise
  perlin3D(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.permutation[X] + Y;
    const AA = this.permutation[A] + Z;
    const AB = this.permutation[A + 1] + Z;
    const B = this.permutation[X + 1] + Y;
    const BA = this.permutation[B] + Z;
    const BB = this.permutation[B + 1] + Z;

    return this.lerp(w,
      this.lerp(v,
        this.lerp(u, this.grad3D(this.permutation[AA], x, y, z),
                     this.grad3D(this.permutation[BA], x - 1, y, z)),
        this.lerp(u, this.grad3D(this.permutation[AB], x, y - 1, z),
                     this.grad3D(this.permutation[BB], x - 1, y - 1, z))),
      this.lerp(v,
        this.lerp(u, this.grad3D(this.permutation[AA + 1], x, y, z - 1),
                     this.grad3D(this.permutation[BA + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad3D(this.permutation[AB + 1], x, y - 1, z - 1),
                     this.grad3D(this.permutation[BB + 1], x - 1, y - 1, z - 1)))
    );
  }

  // Simplex noise (2D)
  simplex2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    let n0: number, n1: number, n2: number;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);

    let i1: number, j1: number;
    if (x0 > y0) {
      i1 = 1; j1 = 0;
    } else {
      i1 = 0; j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permutation12[ii + this.permutation[jj]];
    const gi1 = this.permutation12[ii + i1 + this.permutation[jj + j1]];
    const gi2 = this.permutation12[ii + 1 + this.permutation[jj + 1]];

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) {
      n0 = 0.0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * this.dot2D(this.getGrad2D(gi0), x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
      n1 = 0.0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * this.dot2D(this.getGrad2D(gi1), x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
      n2 = 0.0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * this.dot2D(this.getGrad2D(gi2), x2, y2);
    }

    return 70.0 * (n0 + n1 + n2);
  }

  // Worley/Voronoi noise
  worley2D(x: number, y: number, distanceFunction: 'euclidean' | 'manhattan' | 'chebyshev' = 'euclidean'): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);

    let minDist = Infinity;

    for (let yo = -1; yo <= 1; yo++) {
      for (let xo = -1; xo <= 1; xo++) {
        const nx = xi + xo;
        const ny = yi + yo;

        const hash = this.hash2D(nx, ny);
        const px = nx + (hash % 1000) / 1000;
        const py = ny + (Math.floor(hash / 1000) % 1000) / 1000;

        const dist = this.distance(x, y, px, py, distanceFunction);
        minDist = Math.min(minDist, dist);
      }
    }

    return minDist;
  }

  // Ridged noise
  ridgedNoise2D(x: number, y: number): number {
    const value = Math.abs(this.perlin2D(x, y));
    return 1.0 - value;
  }

  // Turbulence
  turbulence2D(x: number, y: number, octaves: number = 6): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;

    for (let i = 0; i < octaves; i++) {
      value += Math.abs(this.perlin2D(x * frequency, y * frequency)) * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value;
  }

  // Billowy noise
  billow2D(x: number, y: number): number {
    return Math.abs(this.perlin2D(x, y)) * 2 - 1;
  }

  // Fractal Brownian Motion (FBM)
  fbm2D(x: number, y: number, config: NoiseConfig): number {
    let value = 0;
    let amplitude = config.amplitude;
    let frequency = config.frequency;

    for (let i = 0; i < config.octaves; i++) {
      value += this.perlin2D(x * frequency, y * frequency) * amplitude;
      amplitude *= config.persistence;
      frequency *= config.lacunarity;
    }

    return value;
  }

  // Generate noise with specified type
  generate2D(x: number, y: number, type: NoiseType, config?: NoiseConfig): number {
    const scaledX = x * (config?.scale || 1);
    const scaledY = y * (config?.scale || 1);

    switch (type) {
      case 'perlin':
        return config ? this.fbm2D(scaledX, scaledY, config) : this.perlin2D(scaledX, scaledY);
      case 'simplex':
        return this.simplex2D(scaledX, scaledY);
      case 'value':
        return this.valueNoise2D(scaledX, scaledY);
      case 'worley':
        return this.worley2D(scaledX, scaledY);
      case 'ridge':
        return this.ridgedNoise2D(scaledX, scaledY);
      case 'turbulence':
        return this.turbulence2D(scaledX, scaledY, config?.octaves || 6);
      case 'billow':
        return this.billow2D(scaledX, scaledY);
      default:
        return this.perlin2D(scaledX, scaledY);
    }
  }

  // Value noise
  private valueNoise2D(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);

    const xf = x - xi;
    const yf = y - yi;

    const u = this.fade(xf);
    const v = this.fade(yf);

    const a = this.hash2D(xi, yi);
    const b = this.hash2D(xi + 1, yi);
    const c = this.hash2D(xi, yi + 1);
    const d = this.hash2D(xi + 1, yi + 1);

    const x1 = this.lerp(this.normalize(a), this.normalize(b), u);
    const x2 = this.lerp(this.normalize(c), this.normalize(d), u);

    return this.lerp(x1, x2, v);
  }

  // Utility functions
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad2D(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private grad3D(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private getGrad2D(gi: number): { x: number; y: number } {
    const grad2 = [
      { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 },
      { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 0, y: 1 }, { x: 0, y: -1 }
    ];
    return grad2[gi];
  }

  private dot2D(g: { x: number; y: number }, x: number, y: number): number {
    return g.x * x + g.y * y;
  }

  private hash2D(x: number, y: number): number {
    return ((x * 374761393 + y * 668265263) ^ (x * 1274126177 + y * 1984731177)) & 0x7fffffff;
  }

  private distance(x1: number, y1: number, x2: number, y2: number, type: 'euclidean' | 'manhattan' | 'chebyshev'): number {
    const dx = x2 - x1;
    const dy = y2 - y1;

    switch (type) {
      case 'euclidean':
        return Math.sqrt(dx * dx + dy * dy);
      case 'manhattan':
        return Math.abs(dx) + Math.abs(dy);
      case 'chebyshev':
        return Math.max(Math.abs(dx), Math.abs(dy));
      default:
        return Math.sqrt(dx * dx + dy * dy);
    }
  }

  private normalize(value: number): number {
    return ((value % 1000) / 1000) * 2 - 1;
  }

  // Seed management
  setSeed(seed: number): void {
    this.seed = seed;
    this.initializePermutations();
  }

  getSeed(): number {
    return this.seed;
  }
}
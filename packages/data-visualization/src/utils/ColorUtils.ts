/**
 * Color Utilities for Steam Simulation Toolkit
 * Comprehensive color manipulation and conversion utilities
 */

import { Color, ColorHSV } from '../core/types';

export class ColorUtils {
  // Color format conversions
  public static rgbToHex(color: Color): string {
    const r = Math.round(Math.max(0, Math.min(255, color.r)));
    const g = Math.round(Math.max(0, Math.min(255, color.g)));
    const b = Math.round(Math.max(0, Math.min(255, color.b)));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  public static hexToRgb(hex: string): Color | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  public static rgbToHsl(color: Color): { h: number; s: number; l: number; a?: number } {
    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;

    const l = sum / 2;
    let h = 0;
    let s = 0;

    if (diff !== 0) {
      s = l > 0.5 ? diff / (2 - sum) : diff / sum;

      switch (max) {
        case r:
          h = ((g - b) / diff) + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / diff + 2;
          break;
        case b:
          h = (r - g) / diff + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: h * 360,
      s: s * 100,
      l: l * 100,
      a: color.a
    };
  }

  public static hslToRgb(h: number, s: number, l: number, a?: number): Color {
    h = ((h % 360) + 360) % 360; // Normalize to 0-360
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
      r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
      r = c; g = 0; b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
      a
    };
  }

  public static rgbToHsv(color: Color): ColorHSV {
    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    const v = max;
    const s = max === 0 ? 0 : diff / max;

    let h = 0;
    if (diff !== 0) {
      switch (max) {
        case r:
          h = ((g - b) / diff) + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / diff + 2;
          break;
        case b:
          h = (r - g) / diff + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: h * 360,
      s: s * 100,
      v: v * 100,
      a: color.a
    };
  }

  public static hsvToRgb(hsv: ColorHSV): Color {
    const h = ((hsv.h % 360) + 360) % 360;
    const s = Math.max(0, Math.min(100, hsv.s)) / 100;
    const v = Math.max(0, Math.min(100, hsv.v)) / 100;

    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;

    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
      r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
      r = c; g = 0; b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
      a: hsv.a
    };
  }

  public static rgbToString(color: Color, includeAlpha: boolean = false): string {
    if (includeAlpha && color.a !== undefined) {
      return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
    }
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  }

  // Color manipulation
  public static lighten(color: Color, amount: number): Color {
    const hsl = ColorUtils.rgbToHsl(color);
    hsl.l = Math.min(100, hsl.l + amount);
    return ColorUtils.hslToRgb(hsl.h, hsl.s, hsl.l, color.a);
  }

  public static darken(color: Color, amount: number): Color {
    const hsl = ColorUtils.rgbToHsl(color);
    hsl.l = Math.max(0, hsl.l - amount);
    return ColorUtils.hslToRgb(hsl.h, hsl.s, hsl.l, color.a);
  }

  public static saturate(color: Color, amount: number): Color {
    const hsl = ColorUtils.rgbToHsl(color);
    hsl.s = Math.min(100, hsl.s + amount);
    return ColorUtils.hslToRgb(hsl.h, hsl.s, hsl.l, color.a);
  }

  public static desaturate(color: Color, amount: number): Color {
    const hsl = ColorUtils.rgbToHsl(color);
    hsl.s = Math.max(0, hsl.s - amount);
    return ColorUtils.hslToRgb(hsl.h, hsl.s, hsl.l, color.a);
  }

  public static adjustHue(color: Color, degrees: number): Color {
    const hsl = ColorUtils.rgbToHsl(color);
    hsl.h = (hsl.h + degrees) % 360;
    if (hsl.h < 0) hsl.h += 360;
    return ColorUtils.hslToRgb(hsl.h, hsl.s, hsl.l, color.a);
  }

  public static setAlpha(color: Color, alpha: number): Color {
    return {
      ...color,
      a: Math.max(0, Math.min(1, alpha))
    };
  }

  public static invert(color: Color): Color {
    return {
      r: 255 - color.r,
      g: 255 - color.g,
      b: 255 - color.b,
      a: color.a
    };
  }

  public static grayscale(color: Color): Color {
    const gray = Math.round(color.r * 0.299 + color.g * 0.587 + color.b * 0.114);
    return {
      r: gray,
      g: gray,
      b: gray,
      a: color.a
    };
  }

  // Color blending
  public static mix(color1: Color, color2: Color, ratio: number = 0.5): Color {
    ratio = Math.max(0, Math.min(1, ratio));
    const invRatio = 1 - ratio;

    return {
      r: Math.round(color1.r * invRatio + color2.r * ratio),
      g: Math.round(color1.g * invRatio + color2.g * ratio),
      b: Math.round(color1.b * invRatio + color2.b * ratio),
      a: color1.a !== undefined && color2.a !== undefined
        ? color1.a * invRatio + color2.a * ratio
        : color1.a || color2.a
    };
  }

  public static multiply(color1: Color, color2: Color): Color {
    return {
      r: Math.round((color1.r * color2.r) / 255),
      g: Math.round((color1.g * color2.g) / 255),
      b: Math.round((color1.b * color2.b) / 255),
      a: color1.a !== undefined && color2.a !== undefined
        ? color1.a * color2.a
        : color1.a || color2.a
    };
  }

  public static screen(color1: Color, color2: Color): Color {
    return {
      r: Math.round(255 - ((255 - color1.r) * (255 - color2.r)) / 255),
      g: Math.round(255 - ((255 - color1.g) * (255 - color2.g)) / 255),
      b: Math.round(255 - ((255 - color1.b) * (255 - color2.b)) / 255),
      a: color1.a !== undefined && color2.a !== undefined
        ? 1 - (1 - color1.a) * (1 - color2.a)
        : color1.a || color2.a
    };
  }

  public static overlay(color1: Color, color2: Color): Color {
    const blend = (base: number, overlay: number): number => {
      base /= 255;
      overlay /= 255;
      return Math.round(255 * (base < 0.5
        ? 2 * base * overlay
        : 1 - 2 * (1 - base) * (1 - overlay)));
    };

    return {
      r: blend(color1.r, color2.r),
      g: blend(color1.g, color2.g),
      b: blend(color1.b, color2.b),
      a: color1.a !== undefined && color2.a !== undefined
        ? (color1.a + color2.a) / 2
        : color1.a || color2.a
    };
  }

  // Color harmony and palette generation
  public static getComplementary(color: Color): Color {
    return ColorUtils.adjustHue(color, 180);
  }

  public static getTriadic(color: Color): [Color, Color, Color] {
    return [
      color,
      ColorUtils.adjustHue(color, 120),
      ColorUtils.adjustHue(color, 240)
    ];
  }

  public static getAnalogous(color: Color, angle: number = 30): [Color, Color, Color] {
    return [
      ColorUtils.adjustHue(color, -angle),
      color,
      ColorUtils.adjustHue(color, angle)
    ];
  }

  public static getSplitComplementary(color: Color, angle: number = 30): [Color, Color, Color] {
    return [
      color,
      ColorUtils.adjustHue(color, 180 - angle),
      ColorUtils.adjustHue(color, 180 + angle)
    ];
  }

  public static getTetradic(color: Color): [Color, Color, Color, Color] {
    return [
      color,
      ColorUtils.adjustHue(color, 90),
      ColorUtils.adjustHue(color, 180),
      ColorUtils.adjustHue(color, 270)
    ];
  }

  public static getMonochromatic(color: Color, steps: number = 5): Color[] {
    const colors: Color[] = [];
    const hsl = ColorUtils.rgbToHsl(color);

    for (let i = 0; i < steps; i++) {
      const lightness = (i / (steps - 1)) * 100;
      colors.push(ColorUtils.hslToRgb(hsl.h, hsl.s, lightness, color.a));
    }

    return colors;
  }

  // Color distance and similarity
  public static getDistance(color1: Color, color2: Color): number {
    // Euclidean distance in RGB space
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  public static getPerceptualDistance(color1: Color, color2: Color): number {
    // Delta E CIE76 approximation (simplified)
    const lab1 = ColorUtils.rgbToLab(color1);
    const lab2 = ColorUtils.rgbToLab(color2);

    const dL = lab1.l - lab2.l;
    const da = lab1.a - lab2.a;
    const db = lab1.b - lab2.b;

    return Math.sqrt(dL * dL + da * da + db * db);
  }

  private static rgbToLab(color: Color): { l: number; a: number; b: number } {
    // Simplified RGB to LAB conversion (approximate)
    let r = color.r / 255;
    let g = color.g / 255;
    let b = color.b / 255;

    // Convert to linear RGB
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    // Convert to XYZ (D65 illuminant)
    let x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
    let y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
    let z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;

    // Normalize to D65
    x /= 0.95047;
    y /= 1.00000;
    z /= 1.08883;

    // Convert to LAB
    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);

    return {
      l: (116 * y) - 16,
      a: 500 * (x - y),
      b: 200 * (y - z)
    };
  }

  // Accessibility
  public static getContrast(color1: Color, color2: Color): number {
    const l1 = ColorUtils.getLuminance(color1);
    const l2 = ColorUtils.getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  public static getLuminance(color: Color): number {
    const rsRGB = color.r / 255;
    const gsRGB = color.g / 255;
    const bsRGB = color.b / 255;

    const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  public static isAccessible(foreground: Color, background: Color, level: 'AA' | 'AAA' = 'AA'): boolean {
    const contrast = ColorUtils.getContrast(foreground, background);
    return level === 'AA' ? contrast >= 4.5 : contrast >= 7;
  }

  public static getAccessibleText(background: Color): Color {
    const luminance = ColorUtils.getLuminance(background);
    return luminance > 0.5 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
  }

  // Utility functions
  public static isValidColor(color: any): color is Color {
    return color &&
           typeof color === 'object' &&
           typeof color.r === 'number' &&
           typeof color.g === 'number' &&
           typeof color.b === 'number' &&
           color.r >= 0 && color.r <= 255 &&
           color.g >= 0 && color.g <= 255 &&
           color.b >= 0 && color.b <= 255 &&
           (color.a === undefined || (typeof color.a === 'number' && color.a >= 0 && color.a <= 1));
  }

  public static cloneColor(color: Color): Color {
    return {
      r: color.r,
      g: color.g,
      b: color.b,
      a: color.a
    };
  }

  public static randomColor(alpha?: number): Color {
    return {
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256),
      a: alpha
    };
  }

  public static generatePalette(baseColor: Color, count: number = 5, mode: 'monochromatic' | 'analogous' | 'triadic' = 'analogous'): Color[] {
    switch (mode) {
      case 'monochromatic':
        return ColorUtils.getMonochromatic(baseColor, count);
      case 'analogous':
        const angleStep = 60 / (count - 1);
        return Array.from({ length: count }, (_, i) =>
          ColorUtils.adjustHue(baseColor, -30 + i * angleStep)
        );
      case 'triadic':
        const step = 360 / count;
        return Array.from({ length: count }, (_, i) =>
          ColorUtils.adjustHue(baseColor, i * step)
        );
      default:
        return [baseColor];
    }
  }
}
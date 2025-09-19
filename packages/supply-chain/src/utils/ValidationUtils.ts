/**
 * Validation Utilities for Supply Chain Operations
 */

import { ValidationResult } from '../core/types';

export class ValidationUtils {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number
   */
  static isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  /**
   * Validate numeric range
   */
  static isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  /**
   * Validate required fields
   */
  static validateRequired(obj: Record<string, any>, requiredFields: string[]): ValidationResult {
    const errors: string[] = [];

    for (const field of requiredFields) {
      if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
        errors.push(`Field '${field}' is required`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Validate object schema
   */
  static validateSchema(obj: any, schema: ValidationSchema): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = obj[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`Field '${field}' is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        if (rules.type && typeof value !== rules.type) {
          errors.push(`Field '${field}' must be of type ${rules.type}`);
        }

        if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
          errors.push(`Field '${field}' must be at least ${rules.min}`);
        }

        if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
          errors.push(`Field '${field}' must be at most ${rules.max}`);
        }

        if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
          errors.push(`Field '${field}' does not match required pattern`);
        }

        if (rules.custom) {
          const customResult = rules.custom(value);
          if (!customResult.valid) {
            errors.push(...customResult.errors);
            warnings.push(...customResult.warnings);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Validate positive number
   */
  static isPositiveNumber(value: any): boolean {
    return typeof value === 'number' && value > 0 && !isNaN(value);
  }

  /**
   * Validate non-negative number
   */
  static isNonNegativeNumber(value: any): boolean {
    return typeof value === 'number' && value >= 0 && !isNaN(value);
  }

  /**
   * Validate array with minimum length
   */
  static isValidArray(value: any, minLength: number = 0): boolean {
    return Array.isArray(value) && value.length >= minLength;
  }

  /**
   * Validate date format (ISO string)
   */
  static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * Validate coordinates
   */
  static isValidCoordinates(coords: { x: number; y: number; z?: number }): boolean {
    return typeof coords.x === 'number' &&
           typeof coords.y === 'number' &&
           !isNaN(coords.x) &&
           !isNaN(coords.y) &&
           (coords.z === undefined || (typeof coords.z === 'number' && !isNaN(coords.z)));
  }
}

export interface ValidationSchema {
  [field: string]: ValidationRule;
}

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object';
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => ValidationResult;
}
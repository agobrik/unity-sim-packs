import {
  DataTransformer,
  TransformerType,
  TransformerConfig,
  ValidationResult,
  TransformerSchema,
  DataSchema,
  ErrorHandlingStrategy
} from '../types';

export class BaseDataTransformer implements DataTransformer {
  public readonly id: string;
  public readonly name: string;
  public readonly type: TransformerType;
  public config: TransformerConfig;

  constructor(type: TransformerType, config: TransformerConfig, name?: string) {
    this.id = `transformer_${type}_${Date.now()}`;
    this.name = name || `${type} Transformer`;
    this.type = type;
    this.config = config;
  }

  public async transform(data: any): Promise<any> {
    try {
      // Apply validation if enabled
      if (this.config.options?.validation?.enabled) {
        const validation = this.validate(data);
        if (!validation.valid && this.config.options.validation.strict) {
          throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }

      // Apply transformation based on type
      let result = await this.applyTransformation(data);

      // Apply pipeline transformations if configured
      if (this.config.pipeline) {
        for (const step of this.config.pipeline) {
          result = await step.transformer.transform(result);
        }
      }

      return result;

    } catch (error) {
      return this.handleError(error, data);
    }
  }

  protected async applyTransformation(data: any): Promise<any> {
    switch (this.type) {
      case TransformerType.MAP:
        return this.mapTransform(data);
      case TransformerType.FILTER:
        return this.filterTransform(data);
      case TransformerType.REDUCE:
        return this.reduceTransform(data);
      case TransformerType.AGGREGATE:
        return this.aggregateTransform(data);
      case TransformerType.NORMALIZE:
        return this.normalizeTransform(data);
      case TransformerType.VALIDATE:
        return this.validateTransform(data);
      case TransformerType.CLEAN:
        return this.cleanTransform(data);
      case TransformerType.ENRICH:
        return this.enrichTransform(data);
      default:
        return data;
    }
  }

  protected mapTransform(data: any): any {
    const mapFunction = this.config.parameters.mapFunction;

    if (Array.isArray(data)) {
      return data.map(item => this.applyMapping(item, mapFunction));
    } else {
      return this.applyMapping(data, mapFunction);
    }
  }

  private applyMapping(item: any, mapFunction: any): any {
    if (typeof mapFunction === 'function') {
      return mapFunction(item);
    }

    if (typeof mapFunction === 'object') {
      const mapped: any = {};

      for (const [targetField, sourceField] of Object.entries(mapFunction)) {
        if (typeof sourceField === 'string') {
          mapped[targetField] = this.getNestedValue(item, sourceField);
        } else if (typeof sourceField === 'function') {
          mapped[targetField] = sourceField(item);
        } else {
          mapped[targetField] = sourceField;
        }
      }

      return mapped;
    }

    return item;
  }

  protected filterTransform(data: any): any {
    if (!Array.isArray(data)) {
      data = [data];
    }

    const filterFunction = this.config.parameters.filterFunction;
    const conditions = this.config.parameters.conditions || [];

    return data.filter((item: any) => {
      if (typeof filterFunction === 'function') {
        return filterFunction(item);
      }

      return conditions.every((condition: any) =>
        this.evaluateCondition(item, condition)
      );
    });
  }

  private evaluateCondition(item: any, condition: any): boolean {
    const value = this.getNestedValue(item, condition.field);

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'greater_than':
        return value > condition.value;
      case 'less_than':
        return value < condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return true;
    }
  }

  protected reduceTransform(data: any): any {
    if (!Array.isArray(data)) {
      return data;
    }

    const reduceFunction = this.config.parameters.reduceFunction;
    const initialValue = this.config.parameters.initialValue;

    if (typeof reduceFunction === 'function') {
      return data.reduce(reduceFunction, initialValue);
    }

    // Default reduction: sum numeric fields
    return data.reduce((acc, item) => {
      if (typeof item === 'number') {
        return acc + item;
      }
      return acc;
    }, 0);
  }

  protected aggregateTransform(data: any): any {
    if (!Array.isArray(data)) {
      return data;
    }

    const groupBy = this.config.parameters.groupBy;
    const aggregations = this.config.parameters.aggregations || [];

    if (!groupBy) {
      // Aggregate entire dataset
      return this.calculateAggregations(data, aggregations);
    }

    // Group data and aggregate each group
    const groups = this.groupData(data, groupBy);
    const result: any = {};

    for (const [key, items] of Object.entries(groups)) {
      result[key] = this.calculateAggregations(items as any[], aggregations);
    }

    return result;
  }

  private groupData(data: any[], groupBy: string[]): Record<string, any[]> {
    return data.reduce((groups, item) => {
      const key = groupBy.map(field => this.getNestedValue(item, field)).join('|');

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(item);
      return groups;
    }, {} as Record<string, any[]>);
  }

  private calculateAggregations(data: any[], aggregations: any[]): any {
    const result: any = {};

    for (const agg of aggregations) {
      const field = agg.field;
      const func = agg.function;
      const values = data.map(item => this.getNestedValue(item, field)).filter(v => v != null);

      switch (func) {
        case 'count':
          result[agg.alias || `${field}_count`] = data.length;
          break;
        case 'sum':
          result[agg.alias || `${field}_sum`] = values.reduce((sum, val) => sum + Number(val), 0);
          break;
        case 'avg':
          result[agg.alias || `${field}_avg`] = values.length > 0
            ? values.reduce((sum, val) => sum + Number(val), 0) / values.length
            : 0;
          break;
        case 'min':
          result[agg.alias || `${field}_min`] = values.length > 0 ? Math.min(...values.map(Number)) : null;
          break;
        case 'max':
          result[agg.alias || `${field}_max`] = values.length > 0 ? Math.max(...values.map(Number)) : null;
          break;
        case 'first':
          result[agg.alias || `${field}_first`] = values.length > 0 ? values[0] : null;
          break;
        case 'last':
          result[agg.alias || `${field}_last`] = values.length > 0 ? values[values.length - 1] : null;
          break;
      }
    }

    return result;
  }

  protected normalizeTransform(data: any): any {
    const normalizationType = this.config.parameters.type || 'minmax';
    const fields = this.config.parameters.fields || [];

    if (Array.isArray(data)) {
      return data.map(item => this.normalizeItem(item, normalizationType, fields));
    } else {
      return this.normalizeItem(data, normalizationType, fields);
    }
  }

  private normalizeItem(item: any, type: string, fields: string[]): any {
    const normalized = { ...item };

    for (const field of fields) {
      const value = this.getNestedValue(item, field);

      if (typeof value === 'number') {
        const normalizedValue = this.normalizeValue(value, type, this.config.parameters[field] || {});
        this.setNestedValue(normalized, field, normalizedValue);
      }
    }

    return normalized;
  }

  private normalizeValue(value: number, type: string, params: any): number {
    switch (type) {
      case 'minmax':
        const min = params.min || 0;
        const max = params.max || 1;
        const dataMin = params.dataMin || 0;
        const dataMax = params.dataMax || 100;
        return min + ((value - dataMin) / (dataMax - dataMin)) * (max - min);

      case 'zscore':
        const mean = params.mean || 0;
        const std = params.std || 1;
        return (value - mean) / std;

      default:
        return value;
    }
  }

  protected validateTransform(data: any): any {
    const validation = this.validate(data);

    if (!validation.valid) {
      if (this.config.options?.errorHandling === ErrorHandlingStrategy.FAIL_FAST) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    }

    return {
      data,
      validation
    };
  }

  protected cleanTransform(data: any): any {
    const cleaningRules = this.config.parameters.rules || [];

    if (Array.isArray(data)) {
      return data.map(item => this.cleanItem(item, cleaningRules)).filter(item => item !== null);
    } else {
      return this.cleanItem(data, cleaningRules);
    }
  }

  private cleanItem(item: any, rules: any[]): any {
    let cleaned = { ...item };

    for (const rule of rules) {
      switch (rule.type) {
        case 'remove_null':
          cleaned = this.removeNullValues(cleaned);
          break;
        case 'remove_empty':
          cleaned = this.removeEmptyValues(cleaned);
          break;
        case 'trim_strings':
          cleaned = this.trimStringValues(cleaned);
          break;
        case 'remove_duplicates':
          // This would be applied at array level
          break;
        case 'fix_encoding':
          cleaned = this.fixEncoding(cleaned);
          break;
        case 'standardize_case':
          cleaned = this.standardizeCase(cleaned, rule.case || 'lower');
          break;
      }
    }

    return cleaned;
  }

  private removeNullValues(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.filter(item => item !== null && item !== undefined);
    }

    if (obj && typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined) {
          cleaned[key] = this.removeNullValues(value);
        }
      }
      return cleaned;
    }

    return obj;
  }

  private removeEmptyValues(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.filter(item => {
        if (item === null || item === undefined) return false;
        if (typeof item === 'string' && item.trim() === '') return false;
        if (Array.isArray(item) && item.length === 0) return false;
        if (typeof item === 'object' && Object.keys(item).length === 0) return false;
        return true;
      });
    }

    if (obj && typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = this.removeEmptyValues(value);
        if (cleanedValue !== null && cleanedValue !== undefined) {
          if (typeof cleanedValue === 'string' && cleanedValue.trim() !== '') {
            cleaned[key] = cleanedValue;
          } else if (typeof cleanedValue !== 'string') {
            cleaned[key] = cleanedValue;
          }
        }
      }
      return cleaned;
    }

    return obj;
  }

  private trimStringValues(obj: any): any {
    if (typeof obj === 'string') {
      return obj.trim();
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.trimStringValues(item));
    }

    if (obj && typeof obj === 'object') {
      const trimmed: any = {};
      for (const [key, value] of Object.entries(obj)) {
        trimmed[key] = this.trimStringValues(value);
      }
      return trimmed;
    }

    return obj;
  }

  private fixEncoding(obj: any): any {
    if (typeof obj === 'string') {
      // Fix common encoding issues
      return obj
        .replace(/â€™/g, "'")
        .replace(/â€œ/g, '"')
        .replace(/â€/g, '"')
        .replace(/â€¢/g, '•')
        .replace(/â€"/g, '–')
        .replace(/â€"/g, '—');
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.fixEncoding(item));
    }

    if (obj && typeof obj === 'object') {
      const fixed: any = {};
      for (const [key, value] of Object.entries(obj)) {
        fixed[key] = this.fixEncoding(value);
      }
      return fixed;
    }

    return obj;
  }

  private standardizeCase(obj: any, caseType: string): any {
    if (typeof obj === 'string') {
      switch (caseType) {
        case 'lower':
          return obj.toLowerCase();
        case 'upper':
          return obj.toUpperCase();
        case 'title':
          return obj.replace(/\w\S*/g, txt =>
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
          );
        default:
          return obj;
      }
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.standardizeCase(item, caseType));
    }

    if (obj && typeof obj === 'object') {
      const standardized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        standardized[key] = this.standardizeCase(value, caseType);
      }
      return standardized;
    }

    return obj;
  }

  protected enrichTransform(data: any): any {
    const enrichmentRules = this.config.parameters.rules || [];

    if (Array.isArray(data)) {
      return data.map(item => this.enrichItem(item, enrichmentRules));
    } else {
      return this.enrichItem(data, enrichmentRules);
    }
  }

  private enrichItem(item: any, rules: any[]): any {
    let enriched = { ...item };

    for (const rule of rules) {
      switch (rule.type) {
        case 'add_timestamp':
          enriched[rule.field || 'timestamp'] = new Date().toISOString();
          break;
        case 'add_id':
          enriched[rule.field || 'id'] = this.generateId();
          break;
        case 'calculate_field':
          enriched[rule.field] = this.calculateField(enriched, rule.expression);
          break;
        case 'lookup':
          enriched = this.performLookup(enriched, rule);
          break;
        case 'geocode':
          enriched = this.performGeocode(enriched, rule);
          break;
      }
    }

    return enriched;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateField(item: any, expression: string): any {
    // Simple expression evaluation - in production, use a proper expression evaluator
    try {
      // Replace field references with actual values
      let evaluatedExpression = expression;
      const fieldMatches = expression.match(/\{([^}]+)\}/g);

      if (fieldMatches) {
        for (const match of fieldMatches) {
          const field = match.slice(1, -1);
          const value = this.getNestedValue(item, field);
          evaluatedExpression = evaluatedExpression.replace(match, String(value));
        }
      }

      // Evaluate simple mathematical expressions
      return Function(`"use strict"; return (${evaluatedExpression})`)();
    } catch {
      return null;
    }
  }

  private performLookup(item: any, rule: any): any {
    // Mock lookup - in production, this would query external data sources
    const lookupData = rule.data || {};
    const lookupKey = this.getNestedValue(item, rule.keyField);
    const lookupValue = lookupData[lookupKey];

    if (lookupValue) {
      return { ...item, [rule.targetField]: lookupValue };
    }

    return item;
  }

  private performGeocode(item: any, rule: any): any {
    // Mock geocoding - in production, this would call a geocoding service
    const address = this.getNestedValue(item, rule.addressField);

    if (address) {
      return {
        ...item,
        [rule.latitudeField || 'latitude']: 40.7128,
        [rule.longitudeField || 'longitude']: -74.0060
      };
    }

    return item;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }

  public validate(data: any): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic validation based on transformer type
    if (this.type === TransformerType.FILTER && !Array.isArray(data)) {
      warnings.push({
        code: 'NON_ARRAY_FILTER',
        message: 'Filter transformer works best with array data'
      });
    }

    if (this.type === TransformerType.AGGREGATE && !Array.isArray(data)) {
      errors.push({
        code: 'NON_ARRAY_AGGREGATE',
        message: 'Aggregate transformer requires array data'
      });
    }

    // Custom validation rules
    if (this.config.options?.validation?.rules) {
      for (const rule of this.config.options.validation.rules) {
        if (!this.evaluateValidationRule(data, rule)) {
          errors.push({
            field: rule.field,
            code: 'VALIDATION_RULE_FAILED',
            message: rule.message
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private evaluateValidationRule(data: any, rule: any): boolean {
    // Simple rule evaluation - in production, use a proper rule engine
    try {
      return Function(`"use strict"; return (${rule.condition})`).call(null, data);
    } catch {
      return false;
    }
  }

  private handleError(error: any, originalData: any): any {
    const strategy = this.config.options?.errorHandling || ErrorHandlingStrategy.FAIL_FAST;

    switch (strategy) {
      case ErrorHandlingStrategy.FAIL_FAST:
        throw error;
      case ErrorHandlingStrategy.SKIP_ERRORS:
        return null;
      case ErrorHandlingStrategy.LOG_ERRORS:
        console.error('Transformer error:', error);
        return originalData;
      case ErrorHandlingStrategy.RETRY:
        // In production, implement retry logic
        return originalData;
      default:
        return originalData;
    }
  }

  public getSchema(): TransformerSchema {
    return {
      input: {
        name: 'transformer_input',
        fields: []
      },
      output: {
        name: 'transformer_output',
        fields: []
      },
      dependencies: []
    };
  }
}
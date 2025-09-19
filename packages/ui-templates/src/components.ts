import {
  ComponentTemplate,
  ComponentInstance,
  ComponentCategory,
  PropType,
  StateType,
  ValidationResult,
  ValidationError,
  ErrorType,
  WarningType,
  ValidationWarning,
  ComponentCustomization,
  VariantDefinition,
  CSSProperties,
  ComputedStyles,
  ResponsiveConfig,
  AccessibilityConfig
} from './types';

export class ComponentRegistry {
  private components: Map<string, ComponentTemplate> = new Map();
  private instances: Map<string, ComponentInstance> = new Map();

  public registerComponent(component: ComponentTemplate): void {
    this.components.set(component.id, component);
  }

  public getComponent(id: string): ComponentTemplate | undefined {
    return this.components.get(id);
  }

  public getAllComponents(): ComponentTemplate[] {
    return Array.from(this.components.values());
  }

  public getComponentsByCategory(category: ComponentCategory): ComponentTemplate[] {
    return this.getAllComponents().filter(c => c.category === category);
  }

  public searchComponents(query: string): ComponentTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllComponents().filter(c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description.toLowerCase().includes(lowerQuery) ||
      c.category.toLowerCase().includes(lowerQuery)
    );
  }

  public createInstance(templateId: string, props: Record<string, any> = {}): ComponentInstance {
    const template = this.components.get(templateId);
    if (!template) {
      throw new Error(`Component template '${templateId}' not found`);
    }

    const instance: ComponentInstance = {
      id: this.generateInstanceId(),
      template,
      props: { ...props },
      children: [],
      styles: this.computeStyles(template, props)
    };

    this.instances.set(instance.id, instance);
    return instance;
  }

  public getInstance(id: string): ComponentInstance | undefined {
    return this.instances.get(id);
  }

  public updateInstance(id: string, props: Record<string, any>): ComponentInstance {
    const instance = this.instances.get(id);
    if (!instance) {
      throw new Error(`Component instance '${id}' not found`);
    }

    instance.props = { ...instance.props, ...props };
    instance.styles = this.computeStyles(instance.template, instance.props);

    return instance;
  }

  public destroyInstance(id: string): void {
    this.instances.delete(id);
  }

  private generateInstanceId(): string {
    return `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private computeStyles(template: ComponentTemplate, props: Record<string, any>): ComputedStyles {
    const baseStyles = template.composition.structure.styles.base;
    let computedStyles: ComputedStyles = {
      base: { ...baseStyles },
      state: {},
      responsive: {},
      custom: {}
    };

    for (const variant of template.variants) {
      if (this.isVariantActive(variant, props)) {
        Object.assign(computedStyles.base, variant.styles);
      }
    }

    for (const state of template.states) {
      if (this.isStateActive(state, props)) {
        computedStyles.state = { ...computedStyles.state, ...state.styles } as CSSProperties;
      }
    }

    if (template.responsive) {
      computedStyles.responsive = this.computeResponsiveStyles(template.responsive, props);
    }

    return computedStyles;
  }

  private isVariantActive(variant: any, props: Record<string, any>): boolean {
    return Object.entries(variant.props).every(([key, value]) => props[key] === value);
  }

  private isStateActive(state: any, props: Record<string, any>): boolean {
    return state.conditions.some((condition: any) =>
      condition.type === 'prop' && props[condition.selector] === condition.value
    );
  }

  private computeResponsiveStyles(responsive: ResponsiveConfig, props: Record<string, any>): Record<string, CSSProperties> {
    const styles: Record<string, CSSProperties> = {};

    for (const breakpoint of responsive.breakpoints) {
      styles[breakpoint.name] = {};
    }

    return styles;
  }
}

export class ComponentValidator {
  public validate(instance: ComponentInstance): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    this.validateRequiredProps(instance, errors);
    this.validatePropTypes(instance, errors);
    this.validatePropValues(instance, errors, warnings);
    this.validateAccessibility(instance, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateRequiredProps(instance: ComponentInstance, errors: ValidationError[]): void {
    const requiredProps = instance.template.props.required;

    for (const prop of requiredProps) {
      if (!(prop.name in instance.props)) {
        errors.push({
          type: ErrorType.REQUIRED_PROP,
          message: `Required prop '${prop.name}' is missing`,
          property: prop.name
        });
      }
    }
  }

  private validatePropTypes(instance: ComponentInstance, errors: ValidationError[]): void {
    const allProps = [...instance.template.props.required, ...instance.template.props.optional];

    for (const prop of allProps) {
      const value = instance.props[prop.name];
      if (value !== undefined && !this.isValidType(value, prop.type)) {
        errors.push({
          type: ErrorType.INVALID_TYPE,
          message: `Prop '${prop.name}' expected ${prop.type} but got ${typeof value}`,
          property: prop.name,
          value
        });
      }
    }
  }

  private validatePropValues(instance: ComponentInstance, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const allProps = [...instance.template.props.required, ...instance.template.props.optional];

    for (const prop of allProps) {
      const value = instance.props[prop.name];
      if (value !== undefined && prop.validation) {
        for (const rule of prop.validation) {
          const result = this.validateRule(value, rule);
          if (!result.valid) {
            if (result.error) {
              errors.push({
                type: ErrorType.INVALID_VALUE,
                message: result.error,
                property: prop.name,
                value
              });
            }
            if (result.warning) {
              warnings.push({
                type: WarningType.DESIGN_WARNING,
                message: result.warning,
                suggestion: result.suggestion
              });
            }
          }
        }
      }
    }
  }

  private validateAccessibility(instance: ComponentInstance, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const accessibility = instance.template.accessibility;
    if (!accessibility) return;

    for (const role of accessibility.roles) {
      if (role.required && !this.hasAriaRole(instance, role.name)) {
        errors.push({
          type: ErrorType.ACCESSIBILITY_ERROR,
          message: `Required ARIA role '${role.name}' is missing`
        });
      }
    }

    for (const property of accessibility.properties) {
      if (!this.hasAriaProperty(instance, property.name)) {
        warnings.push({
          type: WarningType.ACCESSIBILITY_WARNING,
          message: `ARIA property '${property.name}' is recommended`,
          suggestion: `Add ${property.name}="${property.value}" to improve accessibility`
        });
      }
    }
  }

  private isValidType(value: any, type: PropType): boolean {
    switch (type) {
      case PropType.STRING:
        return typeof value === 'string';
      case PropType.NUMBER:
        return typeof value === 'number';
      case PropType.BOOLEAN:
        return typeof value === 'boolean';
      case PropType.ARRAY:
        return Array.isArray(value);
      case PropType.OBJECT:
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case PropType.FUNCTION:
        return typeof value === 'function';
      default:
        return true;
    }
  }

  private validateRule(value: any, rule: any): { valid: boolean; error?: string; warning?: string; suggestion?: string } {
    // Implement validation rules
    return { valid: true };
  }

  private hasAriaRole(instance: ComponentInstance, roleName: string): boolean {
    // Check if component has the specified ARIA role
    return true; // Simplified implementation
  }

  private hasAriaProperty(instance: ComponentInstance, propertyName: string): boolean {
    // Check if component has the specified ARIA property
    return true; // Simplified implementation
  }
}

export class ComponentCustomizer {
  public customizeComponent(template: ComponentTemplate, customizations: ComponentCustomization): ComponentTemplate {
    const customized: ComponentTemplate = JSON.parse(JSON.stringify(template));

    if (customizations.props) {
      this.applyPropCustomizations(customized, customizations.props);
    }

    if (customizations.styles) {
      this.applyStyleCustomizations(customized, customizations.styles);
    }

    if (customizations.behavior) {
      this.applyBehaviorCustomizations(customized, customizations.behavior);
    }

    if (customizations.accessibility) {
      this.applyAccessibilityCustomizations(customized, customizations.accessibility);
    }

    return customized;
  }

  public createVariant(base: ComponentTemplate, variant: VariantDefinition): ComponentTemplate {
    const variantTemplate = JSON.parse(JSON.stringify(base));
    variantTemplate.id = `${base.id}_${variant.name}`;
    variantTemplate.name = `${base.name} - ${variant.name}`;
    variantTemplate.description = variant.description;

    variantTemplate.variants = [
      {
        name: variant.name,
        description: variant.description,
        props: variant.baseProps,
        styles: variant.styleOverrides,
        preview: {
          props: variant.baseProps
        }
      }
    ];

    return variantTemplate;
  }

  private applyPropCustomizations(template: ComponentTemplate, customizations: any[]): void {
    for (const customization of customizations) {
      const prop = [...template.props.required, ...template.props.optional]
        .find(p => p.name === customization.name);

      if (prop) {
        if (customization.defaultValue !== undefined) {
          prop.defaultValue = customization.defaultValue;
        }
        if (customization.validation) {
          prop.validation = customization.validation;
        }
        if (customization.required !== undefined && !customization.required) {
          const requiredIndex = template.props.required.findIndex(p => p.name === customization.name);
          if (requiredIndex !== -1) {
            const [removedProp] = template.props.required.splice(requiredIndex, 1);
            template.props.optional.push(removedProp);
          }
        }
      }
    }
  }

  private applyStyleCustomizations(template: ComponentTemplate, customizations: any): void {
    if (customizations.base) {
      Object.assign(template.composition.structure.styles.base, customizations.base);
    }

    if (customizations.variants) {
      Object.entries(customizations.variants).forEach(([name, styles]) => {
        const variant = template.variants.find(v => v.name === name);
        if (variant) {
          Object.assign(variant.styles, styles);
        }
      });
    }

    if (customizations.states) {
      Object.entries(customizations.states).forEach(([name, styles]) => {
        const state = template.states.find(s => s.name === name);
        if (state) {
          Object.assign(state.styles, styles);
        }
      });
    }
  }

  private applyBehaviorCustomizations(template: ComponentTemplate, customizations: any): void {
    // Apply behavior customizations
  }

  private applyAccessibilityCustomizations(template: ComponentTemplate, customizations: any): void {
    if (!template.accessibility) {
      template.accessibility = {
        roles: [],
        properties: [],
        states: [],
        keyboardNavigation: {
          shortcuts: [],
          focusable: false,
          focusManagement: {
            strategy: 'auto' as any
          }
        },
        screenReader: {
          announcements: [],
          descriptions: [],
          labels: []
        }
      };
    }

    if (customizations.roles) {
      template.accessibility.roles = [...template.accessibility.roles, ...customizations.roles];
    }

    if (customizations.properties) {
      template.accessibility.properties = [...template.accessibility.properties, ...customizations.properties];
    }

    if (customizations.keyboard) {
      Object.assign(template.accessibility.keyboardNavigation, customizations.keyboard);
    }
  }
}

export const createButtonTemplate = (): ComponentTemplate => {
  return {
    id: 'button',
    name: 'Button',
    category: ComponentCategory.INPUT,
    description: 'A clickable button component with various styles and states',
    version: '1.0.0',
    props: {
      required: [
        {
          name: 'children',
          type: PropType.NODE,
          description: 'Button content'
        }
      ],
      optional: [
        {
          name: 'variant',
          type: PropType.ENUM,
          description: 'Button style variant',
          defaultValue: 'primary',
          examples: ['primary', 'secondary', 'outline', 'ghost']
        },
        {
          name: 'size',
          type: PropType.ENUM,
          description: 'Button size',
          defaultValue: 'medium',
          examples: ['small', 'medium', 'large']
        },
        {
          name: 'disabled',
          type: PropType.BOOLEAN,
          description: 'Whether the button is disabled',
          defaultValue: false
        },
        {
          name: 'loading',
          type: PropType.BOOLEAN,
          description: 'Whether the button is in loading state',
          defaultValue: false
        },
        {
          name: 'onClick',
          type: PropType.FUNCTION,
          description: 'Click event handler'
        }
      ]
    },
    variants: [
      {
        name: 'primary',
        description: 'Primary button style',
        props: { variant: 'primary' },
        styles: {
          '.button': {
            backgroundColor: 'var(--color-primary-main)',
            color: 'var(--color-primary-contrast-text)',
            border: 'none'
          }
        }
      },
      {
        name: 'secondary',
        description: 'Secondary button style',
        props: { variant: 'secondary' },
        styles: {
          '.button': {
            backgroundColor: 'var(--color-secondary-main)',
            color: 'var(--color-secondary-contrast-text)',
            border: 'none'
          }
        }
      },
      {
        name: 'outline',
        description: 'Outlined button style',
        props: { variant: 'outline' },
        styles: {
          '.button': {
            backgroundColor: 'transparent',
            color: 'var(--color-primary-main)',
            border: '1px solid var(--color-primary-main)'
          }
        }
      }
    ],
    states: [
      {
        name: StateType.HOVER,
        description: 'Button hover state',
        conditions: [
          {
            type: 'pseudo' as any,
            selector: ':hover'
          }
        ],
        styles: {
          '.button': {
            opacity: '0.9',
            transform: 'translateY(-1px)'
          }
        },
        behavior: {
          triggers: [
            {
              event: 'mouseenter',
              preventDefault: false,
              stopPropagation: false
            }
          ],
          effects: [
            {
              type: 'style' as any,
              properties: {
                opacity: 0.9,
                transform: 'translateY(-1px)'
              },
              duration: '150ms',
              easing: 'ease-out'
            }
          ]
        }
      },
      {
        name: StateType.DISABLED,
        description: 'Button disabled state',
        conditions: [
          {
            type: 'prop' as any,
            value: true
          }
        ],
        styles: {
          '.button': {
            opacity: '0.6',
            cursor: 'not-allowed',
            pointerEvents: 'none'
          }
        },
        behavior: {
          triggers: [],
          effects: []
        }
      }
    ],
    composition: {
      structure: {
        tag: 'button',
        attributes: {
          type: 'button',
          role: 'button'
        },
        classes: ['button'],
        styles: {
          base: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--spacing-2) var(--spacing-4)',
            fontSize: 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-medium)',
            lineHeight: 'var(--line-height-none)',
            borderRadius: 'var(--border-radius-base)',
            cursor: 'pointer',
            transition: 'var(--transition-all)',
            outline: 'none',
            textDecoration: 'none',
            userSelect: 'none'
          },
          variants: {},
          states: {},
          responsive: {}
        }
      },
      children: [
        {
          id: 'button-content',
          component: 'span',
          props: {
            className: 'button-content'
          }
        }
      ],
      slots: [
        {
          name: 'children',
          description: 'Button content slot',
          required: true
        }
      ]
    },
    accessibility: {
      roles: [
        {
          name: 'button',
          required: true,
          description: 'Identifies the element as a button'
        }
      ],
      properties: [
        {
          name: 'aria-label',
          value: '',
          description: 'Accessible name for the button'
        }
      ],
      states: [
        {
          name: 'aria-disabled',
          value: false,
          condition: 'props.disabled'
        }
      ],
      keyboardNavigation: {
        shortcuts: [
          {
            key: 'Enter',
            modifiers: [],
            action: 'click',
            description: 'Activate button'
          },
          {
            key: ' ',
            modifiers: [],
            action: 'click',
            description: 'Activate button'
          }
        ],
        focusable: true,
        focusManagement: {
          strategy: 'auto' as any
        }
      },
      screenReader: {
        announcements: [
          {
            trigger: 'click',
            message: 'Button activated',
            priority: 'polite' as any
          }
        ],
        descriptions: [],
        labels: [
          {
            target: 'self',
            text: 'Button',
            required: false
          }
        ]
      }
    },
    responsive: {
      breakpoints: [
        {
          name: 'sm',
          minWidth: '576px'
        },
        {
          name: 'md',
          minWidth: '768px'
        },
        {
          name: 'lg',
          minWidth: '992px'
        }
      ],
      strategy: 'mobileFirst' as any,
      layout: {
        columns: {
          xs: 12,
          sm: 6,
          md: 4,
          lg: 3,
          xl: 2
        },
        spacing: {
          padding: {
            xs: 'var(--spacing-2)',
            sm: 'var(--spacing-3)',
            md: 'var(--spacing-4)',
            lg: 'var(--spacing-5)',
            xl: 'var(--spacing-6)'
          },
          margin: {
            xs: 'var(--spacing-1)',
            sm: 'var(--spacing-2)',
            md: 'var(--spacing-3)',
            lg: 'var(--spacing-4)',
            xl: 'var(--spacing-5)'
          },
          gap: {
            xs: 'var(--spacing-1)',
            sm: 'var(--spacing-2)',
            md: 'var(--spacing-3)',
            lg: 'var(--spacing-4)',
            xl: 'var(--spacing-5)'
          }
        },
        typography: {
          fontSize: {
            xs: 'var(--font-size-sm)',
            sm: 'var(--font-size-base)',
            md: 'var(--font-size-lg)',
            lg: 'var(--font-size-xl)',
            xl: 'var(--font-size-2xl)'
          },
          lineHeight: {
            xs: 'var(--line-height-tight)',
            sm: 'var(--line-height-normal)',
            md: 'var(--line-height-normal)',
            lg: 'var(--line-height-relaxed)',
            xl: 'var(--line-height-relaxed)'
          },
          letterSpacing: {
            xs: 'var(--letter-spacing-normal)',
            sm: 'var(--letter-spacing-normal)',
            md: 'var(--letter-spacing-wide)',
            lg: 'var(--letter-spacing-wide)',
            xl: 'var(--letter-spacing-wider)'
          }
        }
      }
    },
    theme: {
      colorProps: ['backgroundColor', 'color', 'borderColor'],
      spacingProps: ['padding', 'margin'],
      typographyProps: ['fontSize', 'fontWeight', 'lineHeight'],
      borderProps: ['borderRadius', 'borderWidth'],
      shadowProps: ['boxShadow'],
      customProps: [
        {
          name: 'variant',
          themeKey: 'button.variants',
          transform: {
            type: 'map' as any,
            function: 'mapVariantToStyles'
          }
        }
      ]
    }
  };
};
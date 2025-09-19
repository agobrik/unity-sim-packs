import {
  TemplateBuilder,
  ComponentTemplate,
  ComponentInstance,
  DesignPattern,
  PatternInstance,
  UITheme,
  CodeTarget,
  ValidationResult,
  ComputedStyles,
  CSSProperties
} from './types';
import { ComponentRegistry, ComponentValidator } from './components';
import { PatternRegistry } from './patterns';
import { ThemeManager } from './theme';

export class UITemplateBuilder implements TemplateBuilder {
  private componentRegistry: ComponentRegistry;
  private patternRegistry: PatternRegistry;
  private themeManager: ThemeManager;
  private validator: ComponentValidator;

  constructor() {
    this.componentRegistry = new ComponentRegistry();
    this.patternRegistry = new PatternRegistry();
    this.themeManager = new ThemeManager();
    this.validator = new ComponentValidator();
  }

  public createComponent(template: ComponentTemplate): ComponentInstance {
    this.componentRegistry.registerComponent(template);
    return this.componentRegistry.createInstance(template.id);
  }

  public createPattern(pattern: DesignPattern): PatternInstance {
    this.patternRegistry.registerPattern(pattern);

    const componentInstances: ComponentInstance[] = [];
    for (const componentId of pattern.components) {
      const component = this.componentRegistry.getComponent(componentId);
      if (component) {
        componentInstances.push(this.componentRegistry.createInstance(componentId));
      }
    }

    return this.patternRegistry.createPatternInstance(pattern.id, componentInstances);
  }

  public applyTheme(theme: UITheme): void {
    this.themeManager.registerTheme(theme);
    this.themeManager.setActiveTheme(theme.name);
  }

  public generateCode(target: CodeTarget): string {
    const activeTheme = this.themeManager.getActiveTheme();
    const allComponents = this.componentRegistry.getAllComponents();

    switch (target) {
      case CodeTarget.CSS:
        return this.generateCSS(allComponents, activeTheme);
      case CodeTarget.SCSS:
        return this.generateSCSS(allComponents, activeTheme);
      case CodeTarget.REACT:
        return this.generateReact(allComponents);
      case CodeTarget.VUE:
        return this.generateVue(allComponents);
      case CodeTarget.ANGULAR:
        return this.generateAngular(allComponents);
      case CodeTarget.HTML:
        return this.generateHTML(allComponents, activeTheme);
      case CodeTarget.STYLED_COMPONENTS:
        return this.generateStyledComponents(allComponents, activeTheme);
      case CodeTarget.EMOTION:
        return this.generateEmotion(allComponents, activeTheme);
      default:
        throw new Error(`Unsupported code target: ${target}`);
    }
  }

  public validate(instance: ComponentInstance): ValidationResult {
    return this.validator.validate(instance);
  }

  private generateCSS(components: ComponentTemplate[], theme: UITheme | null): string {
    let css = '';

    if (theme) {
      css += this.themeManager.generateThemeVariables(theme) + '\n\n';
    }

    for (const component of components) {
      css += this.generateComponentCSS(component) + '\n\n';
    }

    return css;
  }

  private generateComponentCSS(component: ComponentTemplate): string {
    const className = `.${component.id}`;
    let css = `/* ${component.name} Component */\n`;

    css += `${className} {\n`;
    css += this.stylesToCSS(component.composition.structure.styles.base, 2);
    css += '}\n';

    for (const variant of component.variants) {
      css += `\n${className}--${variant.name} {\n`;
      for (const [selector, styles] of Object.entries(variant.styles)) {
        if (selector === className || selector.startsWith('.')) {
          css += this.stylesToCSS(styles, 2);
        }
      }
      css += '}\n';
    }

    for (const state of component.states) {
      const stateSelector = this.getStateSelector(state.name.toString());
      css += `\n${className}${stateSelector} {\n`;
      for (const [selector, styles] of Object.entries(state.styles)) {
        if (selector === className || selector.startsWith('.')) {
          css += this.stylesToCSS(styles, 2);
        }
      }
      css += '}\n';
    }

    return css;
  }

  private stylesToCSS(styles: CSSProperties, indent: number = 0): string {
    const indentStr = ' '.repeat(indent);
    let css = '';

    for (const [property, value] of Object.entries(styles)) {
      if (value !== undefined) {
        const kebabProperty = this.camelToKebab(property);
        css += `${indentStr}${kebabProperty}: ${value};\n`;
      }
    }

    return css;
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }

  private getStateSelector(stateName: string): string {
    switch (stateName) {
      case 'hover': return ':hover';
      case 'focus': return ':focus';
      case 'active': return ':active';
      case 'disabled': return ':disabled, [aria-disabled="true"]';
      case 'selected': return '[aria-selected="true"]';
      case 'expanded': return '[aria-expanded="true"]';
      default: return `.${stateName}`;
    }
  }

  private generateSCSS(components: ComponentTemplate[], theme: UITheme | null): string {
    let scss = '';

    if (theme) {
      scss += this.generateSCSSVariables(theme) + '\n\n';
    }

    for (const component of components) {
      scss += this.generateComponentSCSS(component) + '\n\n';
    }

    return scss;
  }

  private generateSCSSVariables(theme: UITheme): string {
    let scss = '// Theme Variables\n';

    scss += '\n// Colors\n';
    const colorEntries = Object.entries(theme.colors.primary);
    for (const [key, value] of colorEntries) {
      scss += `$color-primary-${key}: ${value};\n`;
    }

    scss += '\n// Typography\n';
    const fontEntries = Object.entries(theme.typography.fontSize);
    for (const [key, value] of fontEntries) {
      scss += `$font-size-${key}: ${value};\n`;
    }

    scss += '\n// Spacing\n';
    const spacingEntries = Object.entries(theme.spacing);
    for (const [key, value] of spacingEntries) {
      scss += `$spacing-${key}: ${value};\n`;
    }

    return scss;
  }

  private generateComponentSCSS(component: ComponentTemplate): string {
    let scss = `// ${component.name} Component\n`;
    const className = component.id;

    scss += `.${className} {\n`;
    scss += this.stylesToSCSS(component.composition.structure.styles.base, 2);

    for (const variant of component.variants) {
      scss += `\n  &--${variant.name} {\n`;
      for (const [selector, styles] of Object.entries(variant.styles)) {
        scss += this.stylesToSCSS(styles, 4);
      }
      scss += '  }\n';
    }

    for (const state of component.states) {
      const stateSelector = this.getSCSSStateSelector(state.name.toString());
      scss += `\n  ${stateSelector} {\n`;
      for (const [selector, styles] of Object.entries(state.styles)) {
        scss += this.stylesToSCSS(styles, 4);
      }
      scss += '  }\n';
    }

    scss += '}\n';

    return scss;
  }

  private stylesToSCSS(styles: CSSProperties, indent: number): string {
    const indentStr = ' '.repeat(indent);
    let scss = '';

    for (const [property, value] of Object.entries(styles)) {
      if (value !== undefined) {
        const kebabProperty = this.camelToKebab(property);
        scss += `${indentStr}${kebabProperty}: ${value};\n`;
      }
    }

    return scss;
  }

  private getSCSSStateSelector(stateName: string): string {
    switch (stateName) {
      case 'hover': return '&:hover';
      case 'focus': return '&:focus';
      case 'active': return '&:active';
      case 'disabled': return '&:disabled, &[aria-disabled="true"]';
      case 'selected': return '&[aria-selected="true"]';
      case 'expanded': return '&[aria-expanded="true"]';
      default: return `&.${stateName}`;
    }
  }

  private generateReact(components: ComponentTemplate[]): string {
    let reactCode = "import React from 'react';\nimport './styles.css';\n\n";

    for (const component of components) {
      reactCode += this.generateReactComponent(component) + '\n\n';
    }

    return reactCode;
  }

  private generateReactComponent(component: ComponentTemplate): string {
    const componentName = this.toPascalCase(component.id);
    let reactCode = `export const ${componentName} = (props) => {\n`;

    reactCode += `  const {\n`;
    const allProps = [...component.props.required, ...component.props.optional];
    for (const prop of allProps) {
      const defaultValue = prop.defaultValue !== undefined ? ` = ${JSON.stringify(prop.defaultValue)}` : '';
      reactCode += `    ${prop.name}${defaultValue},\n`;
    }
    reactCode += `    className = '',\n`;
    reactCode += `    ...rest\n`;
    reactCode += `  } = props;\n\n`;

    reactCode += `  const classes = [\n`;
    reactCode += `    '${component.id}',\n`;

    for (const variant of component.variants) {
      const propName = Object.keys(variant.props)[0];
      const propValue = Object.values(variant.props)[0];
      reactCode += `    ${propName} === '${propValue}' && '${component.id}--${variant.name}',\n`;
    }

    reactCode += `    className\n`;
    reactCode += `  ].filter(Boolean).join(' ');\n\n`;

    const tag = component.composition.structure.tag;
    reactCode += `  return (\n`;
    reactCode += `    <${tag} className={classes} {...rest}>\n`;

    if (component.composition.slots.some(slot => slot.name === 'children')) {
      reactCode += `      {children}\n`;
    }

    reactCode += `    </${tag}>\n`;
    reactCode += `  );\n`;
    reactCode += `};\n`;

    return reactCode;
  }

  private generateVue(components: ComponentTemplate[]): string {
    let vueCode = '<template>\n  <div>\n';

    for (const component of components) {
      vueCode += this.generateVueComponent(component) + '\n';
    }

    vueCode += '  </div>\n</template>\n\n';
    vueCode += '<script>\n';
    vueCode += 'export default {\n';
    vueCode += '  name: "UIComponents"\n';
    vueCode += '};\n';
    vueCode += '</script>\n\n';
    vueCode += '<style scoped>\n';
    vueCode += '/* Component styles */\n';
    vueCode += '</style>';

    return vueCode;
  }

  private generateVueComponent(component: ComponentTemplate): string {
    const tag = component.composition.structure.tag;
    const componentName = this.toKebabCase(component.id);

    return `    <${tag} class="${componentName}"></${tag}>`;
  }

  private generateAngular(components: ComponentTemplate[]): string {
    let angularCode = "import { Component } from '@angular/core';\n\n";

    for (const component of components) {
      angularCode += this.generateAngularComponent(component) + '\n\n';
    }

    return angularCode;
  }

  private generateAngularComponent(component: ComponentTemplate): string {
    const componentName = this.toPascalCase(component.id);
    const selector = this.toKebabCase(component.id);

    let angularCode = `@Component({\n`;
    angularCode += `  selector: '${selector}',\n`;
    angularCode += `  template: '<${component.composition.structure.tag} class="${component.id}"></${component.composition.structure.tag}>',\n`;
    angularCode += `  styleUrls: ['./${component.id}.component.css']\n`;
    angularCode += `})\n`;
    angularCode += `export class ${componentName}Component {\n`;

    const allProps = [...component.props.required, ...component.props.optional];
    for (const prop of allProps) {
      angularCode += `  ${prop.name}: ${this.getAngularType(prop.type)};\n`;
    }

    angularCode += `}\n`;

    return angularCode;
  }

  private getAngularType(propType: any): string {
    switch (propType) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'array': return 'any[]';
      case 'object': return 'any';
      case 'function': return 'Function';
      default: return 'any';
    }
  }

  private generateHTML(components: ComponentTemplate[], theme: UITheme | null): string {
    let html = '<!DOCTYPE html>\n';
    html += '<html lang="en">\n';
    html += '<head>\n';
    html += '  <meta charset="UTF-8">\n';
    html += '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
    html += '  <title>UI Components</title>\n';
    html += '  <style>\n';
    html += this.generateCSS(components, theme);
    html += '  </style>\n';
    html += '</head>\n';
    html += '<body>\n';

    for (const component of components) {
      html += this.generateHTMLComponent(component);
    }

    html += '</body>\n';
    html += '</html>';

    return html;
  }

  private generateHTMLComponent(component: ComponentTemplate): string {
    const tag = component.composition.structure.tag;
    const attributes = Object.entries(component.composition.structure.attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');

    return `  <${tag} class="${component.id}" ${attributes}>${component.name}</${tag}>\n`;
  }

  private generateStyledComponents(components: ComponentTemplate[], theme: UITheme | null): string {
    let styledCode = "import styled from 'styled-components';\n\n";

    if (theme) {
      styledCode += 'export const theme = {\n';
      styledCode += this.generateStyledComponentsTheme(theme);
      styledCode += '};\n\n';
    }

    for (const component of components) {
      styledCode += this.generateStyledComponent(component) + '\n\n';
    }

    return styledCode;
  }

  private generateStyledComponent(component: ComponentTemplate): string {
    const componentName = this.toPascalCase(component.id);
    const tag = component.composition.structure.tag;

    let styledCode = `export const ${componentName} = styled.${tag}\`\n`;
    styledCode += this.stylesToStyledComponents(component.composition.structure.styles.base, 2);
    styledCode += '`;\n';

    return styledCode;
  }

  private generateStyledComponentsTheme(theme: UITheme): string {
    let themeCode = '';

    themeCode += '  colors: {\n';
    themeCode += `    primary: '${theme.colors.primary.main}',\n`;
    themeCode += `    secondary: '${theme.colors.secondary.main}',\n`;
    themeCode += '  },\n';

    themeCode += '  spacing: {\n';
    const spacingEntries = Object.entries(theme.spacing).slice(0, 5);
    for (const [key, value] of spacingEntries) {
      themeCode += `    ${key}: '${value}',\n`;
    }
    themeCode += '  },\n';

    return themeCode;
  }

  private stylesToStyledComponents(styles: CSSProperties, indent: number): string {
    const indentStr = ' '.repeat(indent);
    let styledCode = '';

    for (const [property, value] of Object.entries(styles)) {
      if (value !== undefined) {
        const kebabProperty = this.camelToKebab(property);
        styledCode += `${indentStr}${kebabProperty}: ${value};\n`;
      }
    }

    return styledCode;
  }

  private generateEmotion(components: ComponentTemplate[], theme: UITheme | null): string {
    let emotionCode = "import { css, keyframes } from '@emotion/react';\n\n";

    if (theme) {
      emotionCode += 'export const theme = {\n';
      emotionCode += this.generateEmotionTheme(theme);
      emotionCode += '};\n\n';
    }

    for (const component of components) {
      emotionCode += this.generateEmotionComponent(component) + '\n\n';
    }

    return emotionCode;
  }

  private generateEmotionComponent(component: ComponentTemplate): string {
    const componentName = this.toCamelCase(component.id);

    let emotionCode = `export const ${componentName}Styles = css\`\n`;
    emotionCode += this.stylesToEmotion(component.composition.structure.styles.base, 2);
    emotionCode += '`;\n';

    return emotionCode;
  }

  private generateEmotionTheme(theme: UITheme): string {
    return this.generateStyledComponentsTheme(theme);
  }

  private stylesToEmotion(styles: CSSProperties, indent: number): string {
    return this.stylesToStyledComponents(styles, indent);
  }

  private toPascalCase(str: string): string {
    return str.replace(/(?:^|[-_])(\w)/g, (_, c) => c.toUpperCase());
  }

  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  private toKebabCase(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }
}
import {
  DesignPattern,
  PatternCategory,
  PatternInstance,
  ComponentInstance,
  DesignGuideline,
  GuidelineType,
  PatternExample,
  ComponentRelationship,
  RelationshipType,
  CompositionConstraint,
  ConstraintType,
  ResolvedRelationship
} from './types';

export class PatternRegistry {
  private patterns: Map<string, DesignPattern> = new Map();
  private instances: Map<string, PatternInstance> = new Map();

  public registerPattern(pattern: DesignPattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  public getPattern(id: string): DesignPattern | undefined {
    return this.patterns.get(id);
  }

  public getAllPatterns(): DesignPattern[] {
    return Array.from(this.patterns.values());
  }

  public getPatternsByCategory(category: PatternCategory): DesignPattern[] {
    return this.getAllPatterns().filter(p => p.category === category);
  }

  public searchPatterns(query: string): DesignPattern[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllPatterns().filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.category.toLowerCase().includes(lowerQuery)
    );
  }

  public createPatternInstance(
    patternId: string,
    componentInstances: ComponentInstance[]
  ): PatternInstance {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      throw new Error(`Pattern '${patternId}' not found`);
    }

    const instance: PatternInstance = {
      id: this.generateInstanceId(),
      pattern,
      components: componentInstances,
      relationships: this.resolveRelationships(pattern, componentInstances)
    };

    this.instances.set(instance.id, instance);
    return instance;
  }

  private generateInstanceId(): string {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private resolveRelationships(
    pattern: DesignPattern,
    components: ComponentInstance[]
  ): ResolvedRelationship[] {
    const resolved: ResolvedRelationship[] = [];

    for (const relationship of pattern.composition.relationships) {
      const parentInstance = components.find(c => c.template.id === relationship.parent);
      const childInstance = components.find(c => c.template.id === relationship.child);

      if (parentInstance && childInstance) {
        resolved.push({
          ...relationship,
          parentInstance,
          childInstance
        });
      }
    }

    return resolved;
  }

  public validatePatternInstance(instance: PatternInstance): {
    valid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    for (const constraint of instance.pattern.composition.constraints) {
      if (!this.validateConstraint(constraint, instance)) {
        violations.push(constraint.message);
      }
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  private validateConstraint(constraint: CompositionConstraint, instance: PatternInstance): boolean {
    const targetComponents = instance.components.filter(c =>
      c.template.id === constraint.target || c.template.name === constraint.target
    );

    switch (constraint.type) {
      case ConstraintType.REQUIRED:
        return targetComponents.length > 0;

      case ConstraintType.FORBIDDEN:
        return targetComponents.length === 0;

      case ConstraintType.COUNT:
        const [operator, countStr] = constraint.condition.split(' ');
        const count = parseInt(countStr, 10);
        switch (operator) {
          case '>=': return targetComponents.length >= count;
          case '<=': return targetComponents.length <= count;
          case '=': return targetComponents.length === count;
          case '>': return targetComponents.length > count;
          case '<': return targetComponents.length < count;
          default: return true;
        }

      case ConstraintType.CONDITIONAL:
        // Complex conditional logic would be implemented here
        return true;

      default:
        return true;
    }
  }
}

export const createCardPattern = (): DesignPattern => {
  return {
    id: 'card',
    name: 'Card',
    category: PatternCategory.CONTENT,
    description: 'A flexible container for displaying related information with optional header, body, and footer sections',
    components: ['card-container', 'card-header', 'card-body', 'card-footer', 'button', 'image', 'text'],
    composition: {
      structure: [
        {
          tag: 'div',
          attributes: { role: 'article' },
          classes: ['card'],
          styles: {
            base: {
              backgroundColor: 'var(--color-surface-primary)',
              borderRadius: 'var(--border-radius-lg)',
              boxShadow: 'var(--shadow-base)',
              overflow: 'hidden'
            },
            variants: {},
            states: {},
            responsive: {}
          }
        }
      ],
      relationships: [
        {
          parent: 'card-container',
          child: 'card-header',
          type: RelationshipType.CONTAINS,
          properties: { optional: true, position: 'top' }
        },
        {
          parent: 'card-container',
          child: 'card-body',
          type: RelationshipType.CONTAINS,
          properties: { required: true, position: 'middle' }
        },
        {
          parent: 'card-container',
          child: 'card-footer',
          type: RelationshipType.CONTAINS,
          properties: { optional: true, position: 'bottom' }
        }
      ],
      constraints: [
        {
          type: ConstraintType.REQUIRED,
          target: 'card-body',
          condition: 'count >= 1',
          message: 'Card must contain at least one body section'
        },
        {
          type: ConstraintType.COUNT,
          target: 'card-header',
          condition: '<= 1',
          message: 'Card can contain at most one header'
        },
        {
          type: ConstraintType.COUNT,
          target: 'card-footer',
          condition: '<= 1',
          message: 'Card can contain at most one footer'
        }
      ]
    },
    guidelines: [
      {
        title: 'Use cards for grouping related content',
        description: 'Cards work best when they contain related information that users can scan quickly',
        type: GuidelineType.DO,
        examples: [
          {
            description: 'Group product information including image, title, description, and price',
            code: '<Card><CardHeader>Product Title</CardHeader><CardBody><Image/><Text/></CardBody><CardFooter><Button>Add to Cart</Button></CardFooter></Card>'
          }
        ]
      },
      {
        title: 'Avoid nesting cards inside cards',
        description: 'Nested cards can create visual confusion and hierarchy issues',
        type: GuidelineType.DONT,
        examples: [
          {
            description: 'Instead of nesting, use sections or different components',
            code: '// Don\'t: <Card><Card>...</Card></Card>\n// Do: <Card><Section>...</Section></Card>'
          }
        ]
      },
      {
        title: 'Consider card density on mobile',
        description: 'Cards should adapt to smaller screens by stacking vertically and adjusting padding',
        type: GuidelineType.CONSIDER,
        examples: []
      }
    ],
    examples: [
      {
        name: 'Product Card',
        description: 'A card displaying product information with image, title, description, and action button',
        code: `
          <Card>
            <CardHeader>
              <Image src="product.jpg" alt="Product" />
            </CardHeader>
            <CardBody>
              <Heading level="3">Product Title</Heading>
              <Text>Product description goes here...</Text>
              <Text variant="price">$29.99</Text>
            </CardBody>
            <CardFooter>
              <Button variant="primary">Add to Cart</Button>
              <Button variant="outline">View Details</Button>
            </CardFooter>
          </Card>
        `,
        preview: {
          width: '320px',
          height: '400px',
          background: '#f5f5f5',
          padding: '16px',
          centered: true
        }
      },
      {
        name: 'Profile Card',
        description: 'A user profile card with avatar, name, bio, and social links',
        code: `
          <Card>
            <CardHeader>
              <Avatar src="user.jpg" size="large" />
              <Heading level="2">John Doe</Heading>
              <Text variant="subtitle">Software Engineer</Text>
            </CardHeader>
            <CardBody>
              <Text>Passionate developer with 5+ years of experience...</Text>
            </CardBody>
            <CardFooter>
              <Button variant="ghost">Follow</Button>
              <Button variant="ghost">Message</Button>
            </CardFooter>
          </Card>
        `,
        preview: {
          width: '280px',
          height: '350px',
          background: '#ffffff',
          centered: true
        }
      }
    ]
  };
};

export const createNavigationPattern = (): DesignPattern => {
  return {
    id: 'navigation',
    name: 'Navigation',
    category: PatternCategory.NAVIGATION,
    description: 'A comprehensive navigation pattern supporting horizontal and vertical layouts with dropdowns',
    components: ['nav', 'nav-item', 'nav-link', 'dropdown', 'dropdown-menu', 'dropdown-item'],
    composition: {
      structure: [
        {
          tag: 'nav',
          attributes: { role: 'navigation' },
          classes: ['navigation'],
          styles: {
            base: {
              display: 'flex',
              alignItems: 'center',
              padding: 'var(--spacing-3) var(--spacing-4)',
              backgroundColor: 'var(--color-surface-primary)',
              borderBottom: '1px solid var(--color-neutral-gray-200)'
            },
            variants: {},
            states: {},
            responsive: {}
          }
        }
      ],
      relationships: [
        {
          parent: 'nav',
          child: 'nav-item',
          type: RelationshipType.CONTAINS,
          properties: { multiple: true }
        },
        {
          parent: 'nav-item',
          child: 'nav-link',
          type: RelationshipType.CONTAINS,
          properties: { required: true }
        },
        {
          parent: 'nav-item',
          child: 'dropdown',
          type: RelationshipType.CONTAINS,
          properties: { optional: true }
        }
      ],
      constraints: [
        {
          type: ConstraintType.REQUIRED,
          target: 'nav-item',
          condition: 'count >= 1',
          message: 'Navigation must contain at least one nav item'
        }
      ]
    },
    guidelines: [
      {
        title: 'Keep navigation labels clear and concise',
        description: 'Use descriptive but brief labels that clearly indicate where the link will take users',
        type: GuidelineType.DO,
        examples: [
          {
            description: 'Use action-oriented labels',
            code: '// Good: "Products", "About Us", "Contact"\n// Avoid: "Click Here", "Page 1", "Link"'
          }
        ]
      },
      {
        title: 'Limit top-level navigation items',
        description: 'Too many navigation items can overwhelm users and hurt usability',
        type: GuidelineType.CONSIDER,
        examples: [
          {
            description: 'Aim for 5-7 main navigation items for optimal cognitive load'
          }
        ]
      },
      {
        title: 'Provide clear active states',
        description: 'Users should always know which page or section they\'re currently viewing',
        type: GuidelineType.DO,
        examples: []
      }
    ],
    examples: [
      {
        name: 'Horizontal Navigation',
        description: 'Standard horizontal navigation with dropdowns',
        code: `
          <Navigation orientation="horizontal">
            <NavItem>
              <NavLink href="/" active>Home</NavLink>
            </NavItem>
            <NavItem>
              <NavLink href="/products">Products</NavLink>
              <Dropdown>
                <DropdownItem href="/products/category1">Category 1</DropdownItem>
                <DropdownItem href="/products/category2">Category 2</DropdownItem>
              </Dropdown>
            </NavItem>
            <NavItem>
              <NavLink href="/about">About</NavLink>
            </NavItem>
            <NavItem>
              <NavLink href="/contact">Contact</NavLink>
            </NavItem>
          </Navigation>
        `
      },
      {
        name: 'Vertical Sidebar Navigation',
        description: 'Vertical navigation suitable for admin panels or dashboards',
        code: `
          <Navigation orientation="vertical">
            <NavItem>
              <NavLink href="/dashboard" active>
                <Icon name="dashboard" />
                Dashboard
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink href="/users">
                <Icon name="users" />
                Users
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink href="/settings">
                <Icon name="settings" />
                Settings
              </NavLink>
              <Dropdown>
                <DropdownItem href="/settings/general">General</DropdownItem>
                <DropdownItem href="/settings/security">Security</DropdownItem>
              </Dropdown>
            </NavItem>
          </Navigation>
        `
      }
    ]
  };
};

export const createFormPattern = (): DesignPattern => {
  return {
    id: 'form',
    name: 'Form',
    category: PatternCategory.FORM,
    description: 'A comprehensive form pattern with validation, error handling, and accessibility features',
    components: ['form', 'form-group', 'label', 'input', 'textarea', 'select', 'checkbox', 'radio', 'button', 'error-message'],
    composition: {
      structure: [
        {
          tag: 'form',
          attributes: { novalidate: 'true' },
          classes: ['form'],
          styles: {
            base: {
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-4)',
              maxWidth: '600px'
            },
            variants: {},
            states: {},
            responsive: {}
          }
        }
      ],
      relationships: [
        {
          parent: 'form',
          child: 'form-group',
          type: RelationshipType.CONTAINS,
          properties: { multiple: true, required: true }
        },
        {
          parent: 'form-group',
          child: 'label',
          type: RelationshipType.CONTAINS,
          properties: { required: true }
        },
        {
          parent: 'form-group',
          child: 'input',
          type: RelationshipType.CONTAINS,
          properties: { oneOf: ['input', 'textarea', 'select'] }
        },
        {
          parent: 'label',
          child: 'input',
          type: RelationshipType.REFERENCES,
          properties: { htmlFor: 'id' }
        }
      ],
      constraints: [
        {
          type: ConstraintType.REQUIRED,
          target: 'form-group',
          condition: 'count >= 1',
          message: 'Form must contain at least one form group'
        },
        {
          type: ConstraintType.CONDITIONAL,
          target: 'error-message',
          condition: 'input.hasError === true',
          message: 'Error message should be shown when input has validation error'
        }
      ]
    },
    guidelines: [
      {
        title: 'Always associate labels with form controls',
        description: 'Every form control should have a descriptive label for accessibility',
        type: GuidelineType.DO,
        examples: [
          {
            description: 'Use explicit labeling with for/id attributes',
            code: '<label htmlFor="email">Email Address</label>\n<input type="email" id="email" name="email" />'
          }
        ]
      },
      {
        title: 'Provide clear validation feedback',
        description: 'Show validation errors inline and in real-time when possible',
        type: GuidelineType.DO,
        examples: [
          {
            description: 'Display error messages below the related form field',
            code: '<input type="email" aria-invalid="true" aria-describedby="email-error" />\n<div id="email-error" role="alert">Please enter a valid email address</div>'
          }
        ]
      },
      {
        title: 'Group related fields together',
        description: 'Use fieldsets or visual grouping to organize complex forms',
        type: GuidelineType.CONSIDER,
        examples: []
      },
      {
        title: 'Avoid placeholder text as labels',
        description: 'Placeholders disappear when users type and can cause accessibility issues',
        type: GuidelineType.DONT,
        examples: []
      }
    ],
    examples: [
      {
        name: 'Contact Form',
        description: 'A simple contact form with validation',
        code: `
          <Form>
            <FormGroup>
              <Label htmlFor="name" required>Full Name</Label>
              <Input
                type="text"
                id="name"
                name="name"
                required
                aria-describedby="name-error"
              />
              <ErrorMessage id="name-error" />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="email" required>Email Address</Label>
              <Input
                type="email"
                id="email"
                name="email"
                required
                aria-describedby="email-error"
              />
              <ErrorMessage id="email-error" />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                name="message"
                rows="4"
                aria-describedby="message-help"
              />
              <HelpText id="message-help">
                Tell us how we can help you
              </HelpText>
            </FormGroup>

            <FormGroup>
              <Button type="submit" variant="primary">Send Message</Button>
            </FormGroup>
          </Form>
        `
      },
      {
        name: 'Registration Form',
        description: 'User registration form with various input types',
        code: `
          <Form>
            <FormGroup>
              <Label htmlFor="username" required>Username</Label>
              <Input type="text" id="username" name="username" required />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="password" required>Password</Label>
              <Input type="password" id="password" name="password" required />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="country">Country</Label>
              <Select id="country" name="country">
                <option value="">Select a country</option>
                <option value="us">United States</option>
                <option value="ca">Canada</option>
                <option value="uk">United Kingdom</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Checkbox id="terms" name="terms" required>
                I agree to the Terms of Service
              </Checkbox>
            </FormGroup>

            <FormGroup>
              <Button type="submit" variant="primary">Create Account</Button>
            </FormGroup>
          </Form>
        `
      }
    ]
  };
};

export const createDashboardPattern = (): DesignPattern => {
  return {
    id: 'dashboard',
    name: 'Dashboard',
    category: PatternCategory.LAYOUT,
    description: 'A flexible dashboard layout pattern with sidebar navigation, main content area, and widget support',
    components: ['dashboard-container', 'sidebar', 'main-content', 'widget', 'header', 'navigation'],
    composition: {
      structure: [
        {
          tag: 'div',
          attributes: { class: 'dashboard' },
          classes: ['dashboard'],
          styles: {
            base: {
              display: 'grid',
              gridTemplateColumns: '250px 1fr',
              gridTemplateRows: 'auto 1fr',
              gridTemplateAreas: '"sidebar header" "sidebar main"',
              minHeight: '100vh',
              backgroundColor: 'var(--color-background-default)'
            },
            variants: {},
            states: {},
            responsive: {
              '@media (max-width: 768px)': {
                gridTemplateColumns: '1fr',
                gridTemplateRows: 'auto auto 1fr',
                gridTemplateAreas: '"header" "sidebar" "main"'
              }
            }
          }
        }
      ],
      relationships: [
        {
          parent: 'dashboard-container',
          child: 'sidebar',
          type: RelationshipType.CONTAINS,
          properties: { required: true, area: 'sidebar' }
        },
        {
          parent: 'dashboard-container',
          child: 'header',
          type: RelationshipType.CONTAINS,
          properties: { optional: true, area: 'header' }
        },
        {
          parent: 'dashboard-container',
          child: 'main-content',
          type: RelationshipType.CONTAINS,
          properties: { required: true, area: 'main' }
        },
        {
          parent: 'main-content',
          child: 'widget',
          type: RelationshipType.CONTAINS,
          properties: { multiple: true }
        }
      ],
      constraints: [
        {
          type: ConstraintType.REQUIRED,
          target: 'sidebar',
          condition: 'count = 1',
          message: 'Dashboard must have exactly one sidebar'
        },
        {
          type: ConstraintType.REQUIRED,
          target: 'main-content',
          condition: 'count = 1',
          message: 'Dashboard must have exactly one main content area'
        }
      ]
    },
    guidelines: [
      {
        title: 'Prioritize important information above the fold',
        description: 'Place the most critical widgets and information in the primary viewport',
        type: GuidelineType.DO,
        examples: [
          {
            description: 'Position key metrics and alerts at the top of the dashboard'
          }
        ]
      },
      {
        title: 'Use consistent widget sizing and alignment',
        description: 'Maintain visual harmony by using a consistent grid system for widgets',
        type: GuidelineType.DO,
        examples: []
      },
      {
        title: 'Provide customization options',
        description: 'Allow users to rearrange, hide, or resize widgets based on their needs',
        type: GuidelineType.CONSIDER,
        examples: []
      }
    ],
    examples: [
      {
        name: 'Analytics Dashboard',
        description: 'A dashboard for displaying analytics data with various chart widgets',
        code: `
          <Dashboard>
            <Sidebar>
              <Navigation>
                <NavItem active>
                  <NavLink href="/dashboard">Overview</NavLink>
                </NavItem>
                <NavItem>
                  <NavLink href="/analytics">Analytics</NavLink>
                </NavItem>
                <NavItem>
                  <NavLink href="/reports">Reports</NavLink>
                </NavItem>
              </Navigation>
            </Sidebar>

            <Header>
              <Heading level="1">Analytics Dashboard</Heading>
              <UserMenu />
            </Header>

            <MainContent>
              <WidgetGrid>
                <Widget size="large">
                  <WidgetHeader>
                    <Heading level="3">Revenue Trend</Heading>
                  </WidgetHeader>
                  <LineChart data={revenueData} />
                </Widget>

                <Widget size="medium">
                  <WidgetHeader>
                    <Heading level="3">Top Products</Heading>
                  </WidgetHeader>
                  <BarChart data={productData} />
                </Widget>

                <Widget size="small">
                  <Metric
                    label="Total Users"
                    value="12,543"
                    change="+5.2%"
                    trend="up"
                  />
                </Widget>
              </WidgetGrid>
            </MainContent>
          </Dashboard>
        `
      }
    ]
  };
};
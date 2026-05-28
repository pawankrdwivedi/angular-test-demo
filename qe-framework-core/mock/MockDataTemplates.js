import mockDataManager from './MockDataManager.js';
import logger from '../logger/Logger.js';

/**
 * MockDataTemplates - Pre-built mock data scenarios for common testing use cases
 */
class MockDataTemplates {
  constructor() {
    this.setupDefaultTemplates();
  }

  /**
   * Setup default templates for common scenarios
   */
  setupDefaultTemplates() {
    // E-commerce application template
    this.registerTemplate('ecommerce', {
      name: 'E-Commerce Application',
      description: 'Mock data for e-commerce platform with products, customers, and orders',
      endpoints: [
        {
          url: '**/api/products**',
          method: 'GET',
          response: mockDataManager.generate('list', { type: 'product', count: 10 }),
          statusCode: 200,
          delay: 100,
        },
        {
          url: '**/api/customers**',
          method: 'GET',
          response: mockDataManager.generate('list', { type: 'customer', count: 5 }),
          statusCode: 200,
          delay: 100,
        },
        {
          url: '**/api/orders**',
          method: 'GET',
          response: mockDataManager.generate('list', { type: 'order', count: 8, itemCount: 3 }),
          statusCode: 200,
          delay: 150,
        },
      ],
    });

    // User management system template
    this.registerTemplate('userManagement', {
      name: 'User Management System',
      description: 'Mock data for user management and authentication',
      endpoints: [
        {
          url: '**/api/users**',
          method: 'GET',
          response: mockDataManager.generate('list', { type: 'user', count: 10 }),
          statusCode: 200,
          delay: 100,
        },
        {
          url: '**/api/users/*/profile',
          method: 'GET',
          response: mockDataManager.generate('user'),
          statusCode: 200,
          delay: 50,
        },
        {
          url: '**/api/auth/login',
          method: 'POST',
          response: {
            success: true,
            token: 'mock-jwt-token-' + Math.random().toString(36).substr(2, 9),
            user: mockDataManager.generate('user', { role: 'admin' }),
          },
          statusCode: 200,
          delay: 200,
        },
      ],
    });

    // Dashboard with analytics template
    this.registerTemplate('dashboard', {
      name: 'Dashboard Analytics',
      description: 'Mock data for dashboard and analytics components',
      endpoints: [
        {
          url: '**/api/analytics/dashboard',
          method: 'GET',
          response: {
            totalUsers: 1523,
            activeUsers: 342,
            totalRevenue: 125430.5,
            conversionRate: 3.24,
            topProducts: mockDataManager.generate('list', { type: 'product', count: 5 }),
            recentOrders: mockDataManager.generate('list', { type: 'order', count: 10 }),
          },
          statusCode: 200,
          delay: 300,
        },
        {
          url: '**/api/analytics/chart-data**',
          method: 'GET',
          response: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [
              {
                label: 'Sales',
                data: [65, 59, 80, 81, 56, 55],
              },
              {
                label: 'Visits',
                data: [120, 130, 120, 110, 140, 130],
              },
            ],
          },
          statusCode: 200,
          delay: 150,
        },
      ],
    });

    // Content management system template
    this.registerTemplate('cms', {
      name: 'Content Management System',
      description: 'Mock data for CMS articles, pages, and media',
      endpoints: [
        {
          url: '**/api/articles**',
          method: 'GET',
          response: {
            success: true,
            data: [
              {
                id: '1',
                title: 'Getting Started with Mock Data',
                slug: 'getting-started-mock-data',
                author: 'Test Author',
                content: 'Lorem ipsum dolor sit amet...',
                publishedAt: new Date().toISOString(),
                status: 'published',
              },
              {
                id: '2',
                title: 'Advanced Component Testing',
                slug: 'advanced-component-testing',
                author: 'Test Author',
                content: 'Lorem ipsum dolor sit amet...',
                publishedAt: new Date().toISOString(),
                status: 'published',
              },
            ],
            total: 2,
          },
          statusCode: 200,
          delay: 100,
        },
        {
          url: '**/api/pages**',
          method: 'GET',
          response: {
            success: true,
            data: [
              {
                id: '1',
                title: 'Home',
                slug: 'home',
                content: 'Welcome to our site',
              },
              {
                id: '2',
                title: 'About',
                slug: 'about',
                content: 'About our organization',
              },
            ],
          },
          statusCode: 200,
          delay: 100,
        },
      ],
    });

    // Search and filter template
    this.registerTemplate('searchFilter', {
      name: 'Search and Filter',
      description: 'Mock data for search, filtering, and pagination',
      endpoints: [
        {
          url: '**/api/search**',
          method: 'GET',
          response: {
            success: true,
            results: mockDataManager.generate('list', { type: 'product', count: 20 }),
            pagination: {
              page: 1,
              pageSize: 20,
              total: 100,
              totalPages: 5,
            },
          },
          statusCode: 200,
          delay: 200,
        },
      ],
    });

    // Error handling template
    this.registerTemplate('errorHandling', {
      name: 'Error Handling Scenarios',
      description: 'Mock data for testing error states',
      endpoints: [
        {
          url: '**/api/test/not-found**',
          method: 'GET',
          response: mockDataManager.generate('error', {
            code: 'NOT_FOUND',
            message: 'Resource not found',
          }),
          statusCode: 404,
          delay: 50,
        },
        {
          url: '**/api/test/unauthorized**',
          method: 'GET',
          response: mockDataManager.generate('error', {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          }),
          statusCode: 401,
          delay: 50,
        },
        {
          url: '**/api/test/server-error**',
          method: 'GET',
          response: mockDataManager.generate('error', {
            code: 'SERVER_ERROR',
            message: 'Internal server error',
          }),
          statusCode: 500,
          delay: 100,
        },
      ],
    });

    logger.debug('Default mock data templates registered');
  }

  /**
   * Register a custom template
   * @param {string} name - Template name
   * @param {Object} template - Template configuration
   */
  registerTemplate(name, template) {
    mockDataManager.registerTemplate(name, template);
    logger.debug(`Registered template: ${name}`);
  }

  /**
   * Get template by name
   * @param {string} name - Template name
   */
  getTemplate(name) {
    return mockDataManager.loadTemplate(name);
  }

  /**
   * List all available templates
   */
  listTemplates() {
    const templates = [];
    const predefinedTemplates = [
      'ecommerce',
      'userManagement',
      'dashboard',
      'cms',
      'searchFilter',
      'errorHandling',
    ];
    predefinedTemplates.forEach((name) => {
      const template = this.getTemplate(name);
      if (template) {
        templates.push({
          name,
          description: template.description || 'No description',
        });
      }
    });
    return templates;
  }

  /**
   * Create a form validation template
   */
  createFormValidationTemplate(formName, validationRules) {
    return {
      name: `Form: ${formName}`,
      description: `Form validation for ${formName}`,
      endpoints: [
        {
          url: `**/api/validate/${formName}**`,
          method: 'POST',
          response: {
            isValid: true,
            errors: {},
            data: {},
          },
          statusCode: 200,
          delay: 100,
        },
        {
          url: `**/api/submit/${formName}**`,
          method: 'POST',
          response: {
            success: true,
            message: 'Form submitted successfully',
            id: Math.random().toString(36).substr(2, 9),
          },
          statusCode: 201,
          delay: 150,
        },
      ],
    };
  }

  /**
   * Create a file upload template
   */
  createFileUploadTemplate() {
    return {
      name: 'File Upload',
      description: 'Mock data for file upload operations',
      endpoints: [
        {
          url: '**/api/upload**',
          method: 'POST',
          response: {
            success: true,
            fileId: Math.random().toString(36).substr(2, 9),
            fileName: 'uploaded-file.pdf',
            size: 1024000,
            uploadedAt: new Date().toISOString(),
            url: '/files/uploaded-file.pdf',
          },
          statusCode: 201,
          delay: 500,
        },
      ],
    };
  }

  /**
   * Create a GraphQL template
   */
  createGraphQLTemplate(queries) {
    return {
      name: 'GraphQL Operations',
      description: 'Mock data for GraphQL queries and mutations',
      endpoints: [
        {
          url: '**/graphql**',
          method: 'POST',
          response: {
            data: queries,
            errors: null,
          },
          statusCode: 200,
          delay: 100,
        },
      ],
    };
  }
}

export default new MockDataTemplates();

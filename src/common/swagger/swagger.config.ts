import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Custom CSS for a modern, sleek and polished Swagger UI.
 */
const customSwaggerCss = `
  /* Modern clean fonts and background accents */
  .swagger-ui {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1f2937;
  }
  .swagger-ui .topbar {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 12px 0;
  }
  .swagger-ui .topbar .topbar-wrapper a {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.25rem;
    font-weight: 700;
    color: #f8fafc;
  }
  .swagger-ui .info {
    margin: 30px 0 20px 0;
  }
  .swagger-ui .info .title {
    font-size: 2.2rem;
    font-weight: 800;
    color: #111827;
  }
  .swagger-ui .info .description {
    font-size: 0.975rem;
    line-height: 1.6;
    color: #374151;
  }
  .swagger-ui .info .description h3 {
    margin-top: 18px;
    margin-bottom: 8px;
    font-size: 1.2rem;
    font-weight: 700;
    color: #1e1b4b;
    border-bottom: 2px solid #e0e7ff;
    padding-bottom: 4px;
  }
  .swagger-ui .info .description table {
    margin-top: 10px;
    margin-bottom: 15px;
    border-collapse: collapse;
    width: 100%;
  }
  .swagger-ui .info .description table th,
  .swagger-ui .info .description table td {
    border: 1px solid #e5e7eb;
    padding: 8px 12px;
    font-size: 0.875rem;
  }
  .swagger-ui .info .description table th {
    background-color: #f3f4f6;
    font-weight: 600;
  }
  .swagger-ui .opblock {
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    margin-bottom: 12px;
  }
  .swagger-ui .opblock .opblock-summary-method {
    border-radius: 6px;
    font-weight: 700;
    min-width: 80px;
  }
  .swagger-ui .btn.authorize {
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: #ffffff;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(79, 70, 229, 0.25);
  }
  .swagger-ui .btn.authorize svg {
    fill: #ffffff;
  }
  .swagger-ui .filter .operation-filter-input {
    border-radius: 6px;
    border: 1px solid #d1d5db;
    padding: 8px 12px;
  }
  .swagger-ui section.models {
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }
`;

/**
 * Configure and initialize Swagger documentation for the application.
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('🛍️ Multi-Vendor E-Commerce REST API')
    .setDescription(
      `
### 🚀 Overview
Welcome to the official **Multi-Vendor Marketplace API** documentation. 
This API provides full support for customers, independent vendors/sellers, and marketplace administrators.

---

### 🔐 Authentication Guide
Most protected routes require a **JWT Bearer Token**.
1. Call \`POST /api/v1/auth/register\` or \`POST /api/v1/auth/login\` to get an \`accessToken\`.
2. Click the **Authorize 🔓** button at the top right of this page.
3. Paste your token (e.g., \`eyJhbGciOiJIUzI1...\`) into the input field and submit.
4. All subsequent requests in Swagger UI will automatically include the \`Authorization: Bearer <token>\` header.

---

### 👥 User Roles & Access Matrix
| Role | Permissions & Capabilities |
| :--- | :--- |
| **CUSTOMER** | Browse products, create cart, place orders, write reviews, manage profile |
| **VENDOR** | Manage store catalog, add/update products, manage inventory & shipments |
| **ADMIN** | Full system control, vendor approvals, platform commission, user management |

---

### 📦 Standard API Response Format
All standard responses follow this unified envelope:
\`\`\`json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2026-10-20T08:50:00.000Z"
}
\`\`\`
`,
    )
    .setVersion('1.0.0')
    .setContact(
      'Multi-Vendor Support Team',
      'https://example.com/support',
      'api-support@multivendor.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description:
          'Enter JWT Access Token. Example: "Bearer eyJhbGciOi..." (or just the token)',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag(
      'Health & System',
      'Server health check, heartbeat status, and API environment information',
    )
    .addTag(
      'Authentication',
      'User signup, login, JWT token refresh, and identity verification',
    )
    .addTag(
      'Users',
      'User profiles, vendor management, address book, and admin user operations',
    )
    .addTag(
      'Products',
      'Multi-vendor product catalog, searching, filtering, creation, and inventory',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Multi-Vendor API Docs | Swagger UI',
    customCss: customSwaggerCss,
    swaggerOptions: {
      persistAuthorization: true,
      filter: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 2,
      tryItOutEnabled: true,
    },
  });
}

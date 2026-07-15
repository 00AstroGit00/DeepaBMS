import { Router, Request, Response } from 'express';
import type { ApiVersion, RouteDefinition } from './gateway.types';

const PACKAGE_VERSION =
  process.env.npm_package_version || '1.0.0';

const INFO = {
  title: 'DeepaBMS API',
  version: PACKAGE_VERSION,
  description: 'Backend API for Deepa Business Management System',
  contact: {
    name: 'DeepaBMS Support',
    url: 'https://deepabms.com',
    email: 'support@deepabms.com',
  },
};

const SERVERS = [
  {
    url: '/api/v1',
    description: 'API v1',
  },
  {
    url: '/api/v2',
    description: 'API v2 (future)',
  },
];

const routeMetadata: RouteDefinition[] = [];

export function registerRouteMeta(meta: RouteDefinition): void {
  routeMetadata.push(meta);
}

export function getRouteMetadata(): RouteDefinition[] {
  return routeMetadata;
}

export function generateOpenApiSpec(): Record<string, any> {
  const paths: Record<string, any> = {};
  const tags = new Set<string>();

  for (const route of routeMetadata) {
    tags.add(route.path.split('/')[1] || 'default');

    const pathKey = route.path;
    const methodKey = route.method;

    if (!paths[pathKey]) {
      paths[pathKey] = {};
    }

    const tagName = route.path.split('/')[0] || 'default';

    paths[pathKey][methodKey] = {
      tags: [tagName],
      summary: `${route.method.toUpperCase()} ${route.path}`,
      parameters: [
        {
          name: 'X-Tenant-ID',
          in: 'header',
          required: false,
          schema: { type: 'string' },
          description: 'Tenant identifier',
        },
      ],
      responses: {
        '200': {
          description: 'Success',
        },
        '401': {
          description: 'Unauthorized',
        },
        '403': {
          description: 'Forbidden',
        },
        '429': {
          description: 'Too Many Requests',
        },
      },
    };

    if (route.auth) {
      paths[pathKey][methodKey].security = [{ bearerAuth: [] }];
    }
  }

  const spec: Record<string, any> = {
    openapi: '3.0.3',
    info: INFO,
    servers: SERVERS,
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
            },
          },
        },
      },
    },
    tags: Array.from(tags).map((t) => ({ name: t })),
  };

  return spec;
}

export function getOpenApiJson(_req: Request, res: Response): void {
  const spec = generateOpenApiSpec();
  res.json(spec);
}

export function getOpenApiHtml(_req: Request, res: Response): void {
  const spec = generateOpenApiSpec();
  const specJson = JSON.stringify(spec);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DeepaBMS API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      spec: ${specJson},
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.SwaggerUIStandalonePreset,
      ],
      layout: 'BaseLayout',
    });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

export function openApiRouter(): Router {
  const router = Router();

  router.get('/openapi.json', getOpenApiJson);
  router.get('/', getOpenApiHtml);

  return router;
}

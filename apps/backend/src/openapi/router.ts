import type { Router as ExpressRouter } from 'express';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

import { registerAllPaths } from './register.js';
import { buildOpenApiDocument } from './registry.js';

registerAllPaths();
const document = buildOpenApiDocument();

/**
 * Serves the machine-readable contract (`GET /openapi.json`) and
 * an interactive Swagger UI at `/api-docs`.
 */
export const openApiRouter: ExpressRouter = Router();

openApiRouter.get('/openapi.json', (_req, res) => {
  res.json(document);
});

openApiRouter.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(document, {
    customSiteTitle: 'Messaging API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  })
);

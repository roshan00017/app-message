import { NextFunction, Request, Response } from 'express';

import { logger } from '../utils/logger.js';

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  logger.debug(
    {
      method: req.method,
      url: req.url,
      query: req.query,
      ip: req.ip,
    },
    'Incoming request'
  );
  next();
}

import { NextFunction, Request, Response } from 'express';
import { z, ZodSchema } from 'zod';

import { createError } from './async-handler.js';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors.map((e) => e.message).join(', ');
        next(createError(400, message));
      } else {
        next(error);
      }
    }
  };
}

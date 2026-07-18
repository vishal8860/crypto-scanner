import { NextFunction, Request, Response } from 'express';
export const loggingMiddleware = (request: Request, response: Response, next: NextFunction): void => { const startedAt = Date.now(); response.on('finish', () => console.info(JSON.stringify({ method: request.method, path: request.path, status: response.statusCode, durationMs: Date.now() - startedAt }))); next(); };

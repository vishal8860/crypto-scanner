import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
export const errorMiddleware = (error: unknown, _request: Request, response: Response, _next: NextFunction): void => { const statusCode = error instanceof AppError ? error.statusCode : 500; const message = error instanceof AppError ? error.message : 'Internal server error'; response.status(statusCode).json({ error: { message } }); };

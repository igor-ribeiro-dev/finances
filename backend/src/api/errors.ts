import type { Response } from 'express';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ code, message });
}

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

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  fieldErrors?: FieldError[],
): void {
  const body: { code: string; message: string; fieldErrors?: FieldError[] } = { code, message };
  if (fieldErrors && fieldErrors.length > 0) body.fieldErrors = fieldErrors;
  res.status(status).json(body);
}

export function sendValidationError(res: Response, fieldErrors: FieldError[]): void {
  sendError(res, 400, 'validation_error', 'Dados inválidos.', fieldErrors);
}

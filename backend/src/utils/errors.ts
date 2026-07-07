import { Response } from 'express';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function sendError(res: Response, error: unknown, defaultMessage = 'Something went wrong'): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ success: false, message: defaultMessage });
}

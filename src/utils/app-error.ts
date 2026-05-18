export class AppError extends Error {
  readonly isOperational = true;

  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errors?: unknown
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

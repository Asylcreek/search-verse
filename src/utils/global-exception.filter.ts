import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

import { ApiBibleError } from '../api-bible/api-bible.errors';
import { AppError } from './app-error';

const isDev = () => process.env.NODE_ENV === 'development';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(err: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (err instanceof AppError) {
      const body: { status: string; message: string; errors?: unknown } = {
        status: 'fail',
        message: err.message,
      };

      if (err.errors !== undefined) {
        body.errors = err.errors;
      }

      return res.status(err.statusCode).json(body);
    }

    if (err instanceof HttpException) {
      const status = err.getStatus();
      const response = err.getResponse() as Record<string, unknown>;
      const message =
        typeof response === 'string' ? response : response.message;

      if (status === HttpStatus.BAD_REQUEST && Array.isArray(message)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          status: 'fail',
          message: message[0],
        });
      }

      return res.status(status).json({
        status: 'fail',
        message: typeof message === 'string' ? message : err.message,
      });
    }

    if (err instanceof ApiBibleError) {
      this.logger.warn(
        `Upstream api.bible error [${err.status}] ${err.endpoint}: ${err.message}`
      );
      return res.status(HttpStatus.BAD_GATEWAY).json({
        status: 'fail',
        message: 'Upstream service error',
      });
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    this.logger.error(message, err instanceof Error ? err.stack : undefined);

    if (isDev()) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'fail',
        message,
        stack: err instanceof Error ? err.stack : undefined,
      });
    }

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'fail',
      message: 'Something went very wrong!',
    });
  }
}

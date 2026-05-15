import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { ApiBibleError } from '../api-bible/api-bible.errors';

const isDev = () => process.env.NODE_ENV === 'development';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(err: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    ctx.getRequest<Request>();

    if (err instanceof HttpException) {
      const status = err.getStatus();
      const response = err.getResponse() as Record<string, unknown>;

      if (status === HttpStatus.BAD_REQUEST && Array.isArray(response?.message)) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ statusCode: HttpStatus.BAD_REQUEST, message: response.message[0] });
      }

      return res.status(status).json(response);
    }

    if (err instanceof ApiBibleError) {
      this.logger.warn(`Upstream api.bible error [${err.status}] ${err.endpoint}: ${err.message}`);
      return res
        .status(HttpStatus.BAD_GATEWAY)
        .json({ statusCode: HttpStatus.BAD_GATEWAY, message: 'Upstream service error' });
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    this.logger.error(message, err instanceof Error ? err.stack : undefined);

    if (isDev()) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
        stack: err instanceof Error ? err.stack : undefined,
      });
    }

    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Something went very wrong!' });
  }
}

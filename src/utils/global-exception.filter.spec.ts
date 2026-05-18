import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

import { ApiBibleError } from '../api-bible/api-bible.errors';
import { AppError } from './app-error';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const response = { status } as unknown as Response;
  const host = {
    switchToHttp: jest.fn(() => ({
      getResponse: jest.fn(() => response),
    })),
  };

  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('returns fail status for AppError', () => {
    const filter = new GlobalExceptionFilter();

    filter.catch(
      new AppError('Translation not found', HttpStatus.NOT_FOUND),
      host as never
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith({
      status: 'fail',
      message: 'Translation not found',
    });
  });

  it('returns AppError details when present', () => {
    const filter = new GlobalExceptionFilter();

    filter.catch(
      new AppError('Invalid request', HttpStatus.BAD_REQUEST, {
        id: 'required',
      }),
      host as never
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      status: 'fail',
      message: 'Invalid request',
      errors: { id: 'required' },
    });
  });

  it('returns the first validation message for bad requests', () => {
    const filter = new GlobalExceptionFilter();

    filter.catch(
      new BadRequestException({
        message: ['id must be a string', 'id should not be empty'],
      }),
      host as never
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      status: 'fail',
      message: 'id must be a string',
    });
  });

  it('normalizes HttpException responses', () => {
    const filter = new GlobalExceptionFilter();

    filter.catch(
      new HttpException('Forbidden', HttpStatus.FORBIDDEN),
      host as never
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(json).toHaveBeenCalledWith({
      status: 'fail',
      message: 'Forbidden',
    });
  });

  it('maps api.bible errors to upstream service errors', () => {
    const filter = new GlobalExceptionFilter();

    filter.catch(
      new ApiBibleError(503, '/bibles', 'Service unavailable'),
      host as never
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
    expect(json).toHaveBeenCalledWith({
      status: 'fail',
      message: 'Upstream service error',
    });
  });

  it('does not leak unknown errors outside development', () => {
    const filter = new GlobalExceptionFilter();

    filter.catch(new Error('database exploded'), host as never);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      status: 'fail',
      message: 'Something went very wrong!',
    });
  });
});

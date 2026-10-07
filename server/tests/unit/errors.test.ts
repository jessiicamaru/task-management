import { describe, expect, it } from 'vitest';

import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableError,
} from '../../src/utils/errors.js';

describe('AppError subclasses', () => {
  it.each([
    [BadRequestError, 400, 'bad_request'],
    [UnauthorizedError, 401, 'unauthorized'],
    [ForbiddenError, 403, 'forbidden'],
    [NotFoundError, 404, 'not_found'],
    [ConflictError, 409, 'conflict'],
    [UnprocessableError, 422, 'unprocessable'],
    [TooManyRequestsError, 429, 'too_many_requests'],
  ])('%o carries status %i and default code %s', (ErrorClass, status, code) => {
    const err = new ErrorClass();

    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(status);
    expect(err.code).toBe(code);
    expect(err.isOperational).toBe(true);
    expect(err.name).toBe(ErrorClass.name);
    expect(err.stack).toBeTruthy();
  });

  it('takes a specific message, code and details', () => {
    const err = new NotFoundError('Task not found', 'task_not_found', [{ id: 7 }]);

    expect(err.message).toBe('Task not found');
    expect(err.code).toBe('task_not_found');
    expect(err.details).toEqual([{ id: 7 }]);
  });
});

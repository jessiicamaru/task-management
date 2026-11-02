import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as poolModule from '../../src/db/pool.js';
import { requireProjectRole } from '../../src/middlewares/project-guard.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../src/utils/errors.js';

describe('Project Guard Middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects with 401 Unauthorized if user is not authenticated', async () => {
    const req = { params: { projectId: 'prj_123' } } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    await requireProjectRole('owner')(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('returns 404 NotFound if user is not a member of the project (anti-enumeration)', async () => {
    const req = {
      user: { id: 'usr_non_member' },
      params: { projectId: 'prj_secret' },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
      command: '',
      oid: 0,
      fields: [],
    });

    await requireProjectRole('member')(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });

  it('returns 403 Forbidden if user role is not in allowedRoles', async () => {
    const req = {
      user: { id: 'usr_viewer' },
      params: { projectId: 'prj_123' },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
      rows: [{ role: 'viewer' }],
      rowCount: 1,
      command: '',
      oid: 0,
      fields: [],
    });

    await requireProjectRole('owner', 'admin')(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('calls next() without error if user has the required role', async () => {
    const req = {
      user: { id: 'usr_owner' },
      params: { projectId: 'prj_123' },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
      rows: [{ role: 'owner' }],
      rowCount: 1,
      command: '',
      oid: 0,
      fields: [],
    });

    await requireProjectRole('owner')(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});

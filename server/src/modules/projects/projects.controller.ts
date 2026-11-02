import type { NextFunction, Request, Response } from 'express';

import type {
  AddMemberInput,
  CreateProjectInput,
  TransferOwnershipInput,
  UpdateMemberRoleInput,
  UpdateProjectInput,
} from './projects.schema.js';
import { projectsService, type ProjectsService } from './projects.service.js';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] ?? '';
  return param ?? '';
}

export class ProjectsController {
  constructor(private readonly service: ProjectsService = projectsService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const input = req.body as CreateProjectInput;
      const project = await this.service.createProject(userId, input);
      res.setHeader('Location', `/api/v1/projects/${project.id}`);
      res.status(201).json({ project });
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const query = (req.validated?.query ?? {}) as { limit?: number; cursor?: string };
      const result = await this.service.listProjects(userId, query.limit, query.cursor);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const projectId = getParam(req.params.id);
      const project = await this.service.getProject(projectId, userId);
      res.status(200).json({ project });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = getParam(req.params.id);
      const input = req.body as UpdateProjectInput;
      const project = await this.service.updateProject(projectId, input);
      res.status(200).json({ project });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = getParam(req.params.id);
      await this.service.deleteProject(projectId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  listMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = getParam(req.params.id);
      const members = await this.service.listMembers(projectId);
      res.status(200).json({ members });
    } catch (err) {
      next(err);
    }
  };

  addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = getParam(req.params.id);
      const callerRole = req.projectRole!;
      const input = req.body as AddMemberInput;
      const member = await this.service.addMember(projectId, callerRole, input);
      res.status(201).json({ member });
    } catch (err) {
      next(err);
    }
  };

  updateMemberRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = getParam(req.params.id);
      const callerId = req.user!.id;
      const callerRole = req.projectRole!;
      const targetUserId = getParam(req.params.userId);
      const input = req.body as UpdateMemberRoleInput;
      const member = await this.service.updateMemberRole(
        projectId,
        callerId,
        callerRole,
        targetUserId,
        input,
      );
      res.status(200).json({ member });
    } catch (err) {
      next(err);
    }
  };

  removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = getParam(req.params.id);
      const callerId = req.user!.id;
      const callerRole = req.projectRole!;
      const targetUserId = getParam(req.params.userId);
      await this.service.removeMember(projectId, callerId, callerRole, targetUserId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  leave = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = getParam(req.params.id);
      const callerId = req.user!.id;
      const callerRole = req.projectRole!;
      await this.service.removeMember(projectId, callerId, callerRole, callerId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  transferOwnership = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = getParam(req.params.id);
      const callerId = req.user!.id;
      const callerRole = req.projectRole!;
      const input = req.body as TransferOwnershipInput;
      await this.service.transferOwnership(projectId, callerId, callerRole, input.userId);
      res.status(200).json({ message: 'Ownership transferred successfully' });
    } catch (err) {
      next(err);
    }
  };
}

export const projectsController = new ProjectsController();

// Values parsed by the validate() middleware and identity established by authenticate().
declare global {
  namespace Express {
    interface Request {
      validated: {
        query?: unknown;
        params?: unknown;
      };
      user?: {
        id: string;
      };
      projectRole?: 'owner' | 'admin' | 'member' | 'viewer';
    }
  }
}

export {};

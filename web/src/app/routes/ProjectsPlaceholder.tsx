import { FolderPlus } from 'lucide-react';

import { Button, EmptyState } from '../../components/ui';

export function ProjectsPlaceholder() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Your Projects</h1>
          <p className="text-sm text-fg-muted mt-1">Manage tasks and collaborate with your team</p>
        </div>
        <Button variant="primary">
          <FolderPlus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <EmptyState
        title="No projects yet"
        description="You have not created or joined any projects. Click the button above to get started."
      />
    </div>
  );
}

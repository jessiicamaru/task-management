import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  PriorityBadge,
  Select,
  Skeleton,
  Spinner,
  StatusBadge,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useToast,
} from '../../components/ui';
import { useTheme } from '../../lib/theme';

export function DevUi() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { showToast } = useToast();
  const [selectVal, setSelectVal] = useState('react');
  const [checked, setChecked] = useState(false);
  const [dropdownCheck, setDropdownCheck] = useState(true);

  return (
    <div className="min-h-screen bg-bg p-8 text-fg max-w-5xl mx-auto space-y-12">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Design System Showcase</h1>
          <p className="text-sm text-fg-muted mt-1">
            Testing all UI primitives in every state across Light and Dark themes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-fg-muted">Theme ({resolvedTheme}):</span>
          <Button
            size="sm"
            variant={theme === 'light' ? 'primary' : 'outline'}
            onClick={() => setTheme('light')}
          >
            Light
          </Button>
          <Button
            size="sm"
            variant={theme === 'dark' ? 'primary' : 'outline'}
            onClick={() => setTheme('dark')}
          >
            Dark
          </Button>
          <Button
            size="sm"
            variant={theme === 'system' ? 'primary' : 'outline'}
            onClick={() => setTheme('system')}
          >
            System
          </Button>
        </div>
      </header>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-border pb-2">Buttons</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button variant="primary" loading>
            Saving...
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      {/* Inputs & Textareas */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-border pb-2">Form Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Normal Input"
            placeholder="john@example.com"
            helperText="We will never share your email."
          />
          <Input
            label="Input with Error"
            defaultValue="invalid-email"
            error="Please enter a valid email address."
          />
          <Input label="Disabled Input" disabled defaultValue="read-only content" />
          <Textarea label="Textarea" placeholder="Describe the task..." />
        </div>
      </section>

      {/* Select & Checkbox */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-border pb-2">Selection Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <Select
            label="Framework"
            value={selectVal}
            onValueChange={setSelectVal}
            options={[
              { value: 'react', label: 'React 19' },
              { value: 'vite', label: 'Vite' },
              { value: 'tailwind', label: 'Tailwind CSS' },
              { value: 'disabled', label: 'Disabled Choice', disabled: true },
            ]}
          />
          <div className="space-y-3 pt-6">
            <Checkbox
              id="c1"
              label="Accept terms and conditions"
              checked={checked}
              onCheckedChange={(val) => setChecked(Boolean(val))}
            />
            <Checkbox id="c2" label="Checkbox with error" error="This field is required." />
            <Checkbox id="c3" label="Disabled checkbox" disabled checked />
          </div>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-border pb-2">Badges & Statuses</h2>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="danger">Danger</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="success">Success</Badge>
          </div>
          <div className="flex flex-wrap gap-3 items-center pt-2">
            <span className="text-sm font-medium text-fg-muted">Task Status:</span>
            <StatusBadge status="todo" />
            <StatusBadge status="in_progress" />
            <StatusBadge status="blocked" />
            <StatusBadge status="done" />
          </div>
          <div className="flex flex-wrap gap-3 items-center pt-2">
            <span className="text-sm font-medium text-fg-muted">Task Priority:</span>
            <PriorityBadge priority="low" />
            <PriorityBadge priority="medium" />
            <PriorityBadge priority="high" />
            <PriorityBadge priority="urgent" />
          </div>
        </div>
      </section>

      {/* Dialog, Dropdown & Tooltip */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-border pb-2">Interactive Overlays</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Task Details</DialogTitle>
                <DialogDescription>
                  Make changes to your task here. Click save when you are finished.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Input label="Task Title" defaultValue="Implement Dark Mode" />
                <Textarea label="Notes" defaultValue="Make sure AA contrast passes." />
              </div>
              <DialogFooter>
                <Button variant="primary">Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Actions Menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>View details</DropdownMenuItem>
              <DropdownMenuItem>Duplicate task</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={dropdownCheck} onCheckedChange={setDropdownCheck}>
                Auto-assign to me
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive>Delete task</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">Hover for Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>WCAG AA accessible tooltip content</TooltipContent>
          </Tooltip>

          <Button
            variant="secondary"
            onClick={() =>
              showToast({
                type: 'error',
                title: 'Unable to connect to database',
                description: 'PostgreSQL pool connection timeout.',
                requestId: 'req_test_abc123',
              })
            }
          >
            Trigger Error Toast
          </Button>

          <Button
            variant="secondary"
            onClick={() =>
              showToast({
                type: 'success',
                title: 'Changes saved',
                description: 'Design system settings applied successfully.',
              })
            }
          >
            Trigger Success Toast
          </Button>
        </div>
      </section>

      {/* Avatars, Skeletons & Spinners */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-border pb-2">Feedback & Display</h2>
        <div className="flex flex-wrap gap-6 items-center">
          <Avatar name="Alex Morgan" size="sm" />
          <Avatar name="Tran Thanh Hau" size="md" />
          <Avatar name="Cloud Computing" size="lg" />
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
          <div className="flex flex-col gap-2 w-32">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </section>

      {/* Empty State */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-border pb-2">Empty State</h2>
        <EmptyState
          title="No tasks found"
          description="You don't have any tasks in this project yet. Start by creating your first task."
          action={<Button variant="primary">Create First Task</Button>}
        />
      </section>
    </div>
  );
}

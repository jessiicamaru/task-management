import { LogOut, Moon, Sun } from 'lucide-react';
import { type ReactNode } from 'react';
import { Link, Outlet } from 'react-router';

import { useAuth } from '../../features/auth';
import { useTheme } from '../../lib/theme';
import { Avatar, Button } from '../ui';

export function AppShell({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg">
      {/* Skip link for accessibility keyboard navigation */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg focus:shadow-md"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link
              to="/projects"
              className="text-xl font-bold tracking-tight text-fg flex items-center gap-2"
            >
              <span className="h-8 w-8 rounded-lg bg-accent text-accent-fg flex items-center justify-center text-sm font-bold">
                TF
              </span>
              TaskFlow
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-fg-muted">
              <Link to="/projects" className="hover:text-fg transition-colors">
                Projects
              </Link>
              <Link to="/dev/ui" className="hover:text-fg transition-colors">
                UI Kit
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle color theme"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {/* User profile & logout */}
            {user && (
              <div className="flex items-center gap-3 pl-2 border-l border-border">
                <Avatar name={user.name} size="sm" />
                <span className="hidden sm:inline-block text-sm font-medium text-fg max-w-[120px] truncate">
                  {user.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Sign out"
                  onClick={() => void logout()}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 focus:outline-none"
      >
        {children || <Outlet />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 bg-surface text-center text-xs text-fg-muted">
        TaskFlow © {new Date().getFullYear()} — Built with React 19, TypeScript and Vite
      </footer>
    </div>
  );
}

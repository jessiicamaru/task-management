import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';

import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute';
import { AppShell } from '../components/layout';
import { LoginScreen, RegisterScreen } from '../features/auth';
import { DevUi } from './routes/DevUi';
import { NotFound } from './routes/NotFound';
import { ProjectsPlaceholder } from './routes/ProjectsPlaceholder';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to="/projects" replace />,
  },
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: <LoginScreen /> },
      { path: '/register', element: <RegisterScreen /> },
    ],
  },
  {
    path: '/dev/ui',
    element: <DevUi />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [{ path: '/projects', element: <ProjectsPlaceholder /> }],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
];

export const router = createBrowserRouter(routes);

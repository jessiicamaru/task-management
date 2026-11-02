import { createBrowserRouter, type RouteObject } from 'react-router';

import { DevUi } from './routes/DevUi';
import { Hello } from './routes/Hello';

export const routes: RouteObject[] = [
  { path: '/', element: <Hello /> },
  { path: '/dev/ui', element: <DevUi /> },
];

export const router = createBrowserRouter(routes);

import { createBrowserRouter, type RouteObject } from 'react-router';

import { Hello } from './routes/Hello';

export const routes: RouteObject[] = [{ path: '/', element: <Hello /> }];

export const router = createBrowserRouter(routes);

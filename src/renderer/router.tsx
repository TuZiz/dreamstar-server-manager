import { Database, Gauge, PlusCircle, Settings, SquareTerminal } from 'lucide-react';
import { CreateCustomProcess } from './pages/CreateCustomProcess';
import { CreateMinecraftServer } from './pages/CreateMinecraftServer';
import { CreateVelocityServer } from './pages/CreateVelocityServer';
import { Dashboard } from './pages/Dashboard';
import { Databases } from './pages/Databases';
import { EditServerInstance } from './pages/EditServerInstance';
import { ServerTerminal } from './pages/ServerTerminal';
import { SettingsPage } from './pages/Settings';

export const navigation = [
  { to: '/dashboard', label: 'Dashboard', icon: Gauge },
  { to: '/databases', label: 'Databases', icon: Database },
  { to: '/settings', label: 'Settings', icon: Settings }
];

export const routes = [
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/servers/:id', element: <ServerTerminal /> },
  { path: '/servers/:id/edit', element: <EditServerInstance /> },
  { path: '/databases', element: <Databases /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '/create/minecraft', element: <CreateMinecraftServer /> },
  { path: '/create/velocity', element: <CreateVelocityServer /> },
  { path: '/create/custom', element: <CreateCustomProcess /> }
];

export const createActions = [
  { to: '/create/minecraft', label: '添加 Minecraft', icon: PlusCircle },
  { to: '/create/velocity', label: '添加 Velocity', icon: SquareTerminal },
  { to: '/create/custom', label: '添加进程', icon: PlusCircle }
];

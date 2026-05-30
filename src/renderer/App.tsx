import { Activity, Database, Gauge, Settings } from 'lucide-react';
import { useEffect } from 'react';
import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { navigation, routes } from './router';
import { useDatabaseStore } from './stores/useDatabaseStore';
import { useServerStore } from './stores/useServerStore';
import { useSettingsStore } from './stores/useSettingsStore';

function Shell() {
  const loadServers = useServerStore((state) => state.load);
  const refreshStates = useServerStore((state) => state.refreshStates);
  const subscribeRealtime = useServerStore((state) => state.subscribeRealtime);
  const loadDatabases = useDatabaseStore((state) => state.load);
  const loadSettings = useSettingsStore((state) => state.load);

  useEffect(() => {
    void loadServers();
    void loadDatabases();
    void loadSettings();
    const unsubscribe = subscribeRealtime();
    const timer = window.setInterval(() => void refreshStates(), 5000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [loadServers, loadDatabases, loadSettings, refreshStates, subscribeRealtime]);

  return (
    <div className="flex h-screen bg-panel-canvas text-slate-900">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Activity size={19} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-950">DreamStar</div>
            <div className="text-xs text-slate-500">Server Manager</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <Icon size={17} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-4 text-xs leading-5 text-slate-500">
          本地桌面模式
          <br />
          renderer 通过 IPC 调用主进程
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          {routes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}

export const sidebarIcons = { Gauge, Database, Settings };

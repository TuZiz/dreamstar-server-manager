import { Power, RefreshCw, ShieldAlert, SquareTerminal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CommandInput } from '../components/CommandInput';
import { ConfirmDangerDialog } from '../components/ConfirmDangerDialog';
import { LogViewer } from '../components/LogViewer';
import { StatusBadge } from '../components/StatusBadge';
import { TypeBadge } from '../components/TypeBadge';
import { useServerStore } from '../stores/useServerStore';

export function ServerTerminal() {
  const { id = '' } = useParams();
  const { servers, states, logs, loadLogs, clearLogs, stop, restart, kill, sendCommand } = useServerStore();
  const [error, setError] = useState('');
  const [confirmKill, setConfirmKill] = useState(false);
  const server = useMemo(() => servers.find((item) => item.id === id), [servers, id]);
  const state = states[id] ?? { id, status: 'stopped' as const, manualStop: false, lastExitCode: null };
  const running = state.status === 'running';

  useEffect(() => {
    if (id) {
      void loadLogs(id);
    }
  }, [id, loadLogs]);

  const run = async (action: () => Promise<void>) => {
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (!server) {
    return (
      <div className="p-6">
        <div className="panel p-8 text-sm text-slate-600">实例不存在或仍在加载。</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 text-sm text-slate-500">
        <Link to="/dashboard" className="hover:text-slate-900">
          管理面板
        </Link>{' '}
        / 应用实例 / 终端
      </div>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm">
            <SquareTerminal size={24} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-950">{server.name}</h1>
              <StatusBadge status={state.status} />
              <TypeBadge server={server} />
              {server.engine && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  {server.engine}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">{server.workdir}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex h-10 items-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-600" onClick={() => void run(() => stop(id))}>
            <Power size={16} />
            关闭
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" onClick={() => void run(() => restart(id))}>
            <RefreshCw size={16} />
            重启
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 text-sm font-semibold text-red-700" onClick={() => setConfirmKill(true)}>
            <ShieldAlert size={16} />
            终止
          </button>
        </div>
      </header>

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <LogViewer logs={logs[id] ?? []} onClear={() => void run(() => clearLogs(id))} />
        <CommandInput disabled={!running} onSend={(command) => run(() => sendCommand(id, command))} />
      </div>

      <ConfirmDangerDialog
        open={confirmKill}
        title="强制终止进程"
        description={`将强制终止 ${server.name}。如果只是正常停服，请优先使用关闭按钮。`}
        confirmText="强制终止"
        onCancel={() => setConfirmKill(false)}
        onConfirm={() => {
          setConfirmKill(false);
          void run(() => kill(id));
        }}
      />
    </div>
  );
}

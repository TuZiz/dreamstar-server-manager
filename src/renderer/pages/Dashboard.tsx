import { Activity, Clock3, Cpu, Database, Play, Plus, Power, RefreshCw, Server } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ServerCard } from '../components/ServerCard';
import { useServerStore } from '../stores/useServerStore';
import type { InstanceStatus, SystemMetrics } from '../../shared/types';

const ACTIVE_STATUSES: InstanceStatus[] = ['running', 'starting', 'restarting'];

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) {
    return '-';
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatDuration(seconds?: number): string {
  if (!seconds) {
    return '-';
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone = 'slate',
  progress
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
  tone?: 'slate' | 'emerald' | 'blue';
  progress?: number;
}) {
  const toneClass = {
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700'
  }[tone];

  return (
    <section className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${toneClass}`}>{icon}</div>
      </div>
      <div className="mt-2 truncate text-xs text-slate-500">{detail}</div>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      )}
    </section>
  );
}

export function Dashboard() {
  const { servers, states, loading, error, start, stop, restart, kill, delete: deleteServer, startAll, stopAll, restartAll } =
    useServerStore();
  const [actionError, setActionError] = useState('');
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadMetrics = async () => {
      try {
        const next = await window.dreamstar.system.getSystemMetrics();
        if (mounted) setMetrics(next);
      } catch {
        if (mounted) setMetrics(null);
      }
    };
    void loadMetrics();
    const timer = window.setInterval(() => void loadMetrics(), 15000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const runningCount = useMemo(
    () => servers.filter((server) => ACTIVE_STATUSES.includes(states[server.id]?.status ?? 'stopped')).length,
    [servers, states]
  );
  const memoryUsed = metrics ? metrics.totalMemory - metrics.freeMemory : undefined;
  const memoryPercent = metrics && metrics.totalMemory > 0 ? ((metrics.totalMemory - metrics.freeMemory) / metrics.totalMemory) * 100 : undefined;

  const run = async (action: () => Promise<void>) => {
    setActionError('');
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="p-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">实例总览</h1>
          <p className="mt-1 text-sm text-slate-600">集中管理 Minecraft、Velocity 和自定义控制台进程。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-semibold text-white" to="/create/minecraft">
            <Server size={16} />
            添加 Minecraft
          </Link>
          <Link className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" to="/create/velocity">
            <Plus size={16} />
            添加 Velocity
          </Link>
          <Link className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" to="/create/custom">
            <Plus size={16} />
            添加进程
          </Link>
          <Link className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" to="/databases">
            <Database size={16} />
            数据库连接
          </Link>
        </div>
      </header>

      <section className="mb-5 grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={<Activity size={18} />}
          label="实例"
          value={`${runningCount}/${servers.length}`}
          detail="运行中 / 总实例"
          tone={runningCount > 0 ? 'emerald' : 'slate'}
        />
        <MetricCard
          icon={<Cpu size={18} />}
          label="内存"
          value={metrics ? formatBytes(memoryUsed) : '-'}
          detail={metrics ? `${formatBytes(metrics.totalMemory)} 总量 · 剩余 ${formatBytes(metrics.freeMemory)}` : '等待本机指标'}
          tone="blue"
          progress={memoryPercent}
        />
        <MetricCard
          icon={<Clock3 size={18} />}
          label="系统"
          value={metrics ? `${metrics.cpus} 核` : '-'}
          detail={metrics ? `${metrics.platform} ${metrics.arch} · ${formatDuration(metrics.uptime)}` : '等待本机指标'}
        />
      </section>

      <section className="panel mb-5 flex flex-wrap items-center gap-3 p-4">
        <button className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium" onClick={() => void run(startAll)}>
          <Play size={15} />
          启动全部
        </button>
        <button className="inline-flex h-10 items-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-600" onClick={() => void run(stopAll)}>
          <Power size={15} />
          关闭全部
        </button>
        <button className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium" onClick={() => void run(restartAll)}>
          <RefreshCw size={15} />
          重启全部
        </button>
      </section>

      {(error || actionError) && (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError || error}
        </div>
      )}

      {loading ? (
        <div className="panel p-8 text-sm text-slate-500">正在加载实例...</div>
      ) : servers.length === 0 ? (
        <div className="panel p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">还没有实例</h2>
          <p className="mt-2 text-sm text-slate-500">先添加一个已有实例，把工作目录和启动命令托管进来。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3 lg:grid-cols-2">
          {servers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              state={states[server.id] ?? { id: server.id, status: 'stopped', manualStop: false, lastExitCode: null }}
              onStart={() => run(() => start(server.id))}
              onStop={() => run(() => stop(server.id))}
              onRestart={() => run(() => restart(server.id))}
              onKill={() => run(() => kill(server.id))}
              onDelete={() => run(() => deleteServer(server.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

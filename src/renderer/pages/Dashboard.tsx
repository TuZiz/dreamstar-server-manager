import { Database, Play, Plus, Power, RefreshCw, Search, Server } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ServerCard } from '../components/ServerCard';
import { useServerStore } from '../stores/useServerStore';

export function Dashboard() {
  const { servers, states, loading, error, start, stop, restart, kill, delete: deleteServer, startAll, stopAll, restartAll } =
    useServerStore();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [actionError, setActionError] = useState('');

  const filteredServers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return servers.filter((server) => {
      const matchesKeyword =
        !keyword ||
        server.name.toLowerCase().includes(keyword) ||
        server.id.toLowerCase().includes(keyword) ||
        server.workdir.toLowerCase().includes(keyword) ||
        server.group?.toLowerCase().includes(keyword);
      const matchesType = type === 'all' || server.type === type;
      return matchesKeyword && matchesType;
    });
  }, [servers, query, type]);

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
            创建 Minecraft
          </Link>
          <Link className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" to="/create/velocity">
            <Plus size={16} />
            创建 Velocity
          </Link>
          <Link className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" to="/create/custom">
            <Plus size={16} />
            自定义进程
          </Link>
          <Link className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" to="/databases">
            <Database size={16} />
            数据库连接
          </Link>
        </div>
      </header>

      <section className="panel mb-5 flex flex-wrap items-center gap-3 p-4">
        <div className="flex h-10 min-w-72 flex-1 items-center gap-2 rounded-md border border-slate-300 bg-white px-3">
          <Search size={16} className="text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-full flex-1 bg-transparent text-sm outline-none"
            placeholder="搜索名称、ID、目录或分组"
          />
        </div>
        <select className="form-input w-48" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="all">全部类型</option>
          <option value="minecraft">Minecraft</option>
          <option value="velocity">Velocity</option>
          <option value="custom">自定义进程</option>
        </select>
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
      ) : filteredServers.length === 0 ? (
        <div className="panel p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">还没有实例</h2>
          <p className="mt-2 text-sm text-slate-500">先创建一个 Minecraft 服务端或 Velocity 代理。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3 lg:grid-cols-2">
          {filteredServers.map((server) => (
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

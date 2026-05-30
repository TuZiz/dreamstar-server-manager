import { Edit3, Play, Power, RefreshCw, Square, Terminal, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { InstanceRuntimeState, ServerInstanceConfig } from '../../shared/types';
import { ConfirmDangerDialog } from './ConfirmDangerDialog';
import { IconButton } from './IconButton';
import { StatusBadge } from './StatusBadge';
import { TypeBadge } from './TypeBadge';
import { useState } from 'react';

interface ServerCardProps {
  server: ServerInstanceConfig;
  state: InstanceRuntimeState;
  onStart(): Promise<void>;
  onStop(): Promise<void>;
  onRestart(): Promise<void>;
  onKill(): Promise<void>;
  onDelete(): Promise<void>;
}

function formatUptime(seconds?: number): string {
  if (!seconds) {
    return '-';
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return `${hours}h ${minutes}m ${rest}s`;
}

export function ServerCard({ server, state, onStart, onStop, onRestart, onKill, onDelete }: ServerCardProps) {
  const [danger, setDanger] = useState<'kill' | 'delete' | null>(null);
  const running = state.status === 'running' || state.status === 'starting' || state.status === 'restarting';

  const confirm = async () => {
    if (danger === 'kill') {
      await onKill();
    }
    if (danger === 'delete') {
      await onDelete();
    }
    setDanger(null);
  };

  return (
    <article className="panel flex min-h-[260px] flex-col p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-950">{server.name}</h3>
          <p className="mt-1 truncate text-xs text-slate-500">{server.id}</p>
        </div>
        <StatusBadge status={state.status} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <TypeBadge server={server} />
        {server.engine && (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            {server.engine}
          </span>
        )}
        {server.group && (
          <span className="inline-flex rounded-full bg-lime-50 px-2.5 py-1 text-xs font-semibold text-lime-700 ring-1 ring-lime-200">
            {server.group}
          </span>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-slate-500">PID</dt>
          <dd className="font-medium text-slate-800">{state.pid ?? '-'}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">端口</dt>
          <dd className="font-medium text-slate-800">{server.port ?? '-'}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">运行时长</dt>
          <dd className="font-medium text-slate-800">{formatUptime(state.uptimeSeconds)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">在线</dt>
          <dd className="font-medium text-slate-800">
            {state.onlinePlayers ?? '-'} / {state.maxPlayers ?? server.maxPlayers ?? '-'}
          </dd>
        </div>
      </dl>

      <p className="mt-4 truncate border-t border-slate-100 pt-3 text-xs text-slate-500" title={server.workdir}>
        {server.workdir}
      </p>

      <div className="mt-auto flex items-center justify-between pt-4">
        <div className="flex gap-2">
          <IconButton icon={<Play size={16} />} label="启动" disabled={running} onClick={onStart} />
          <IconButton icon={<Square size={16} />} label="停止" danger disabled={!running} onClick={onStop} />
          <IconButton icon={<RefreshCw size={16} />} label="重启" disabled={!server.enabled} onClick={onRestart} />
          <IconButton icon={<Power size={16} />} label="强制终止" danger onClick={() => setDanger('kill')} />
        </div>
        <div className="flex gap-2">
          <Link className="square-button" title="编辑" aria-label="编辑" to={`/servers/${server.id}/edit`}>
            <Edit3 size={16} />
          </Link>
          <Link className="square-button" title="终端" aria-label="终端" to={`/servers/${server.id}`}>
            <Terminal size={16} />
          </Link>
          <IconButton icon={<Trash2 size={16} />} label="删除" danger onClick={() => setDanger('delete')} />
        </div>
      </div>

      <ConfirmDangerDialog
        open={danger !== null}
        title={danger === 'kill' ? '强制终止实例' : '删除实例配置'}
        description={
          danger === 'kill'
            ? `将强制终止 ${server.name} 的进程。请只在正常停止失败后使用。`
            : `将删除 ${server.name} 的面板配置，不会删除服务端目录。`
        }
        confirmText={danger === 'kill' ? '强制终止' : '删除配置'}
        onCancel={() => setDanger(null)}
        onConfirm={confirm}
      />
    </article>
  );
}

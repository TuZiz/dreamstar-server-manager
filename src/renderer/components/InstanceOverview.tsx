import { CheckCircle2, Clock, Copy, FileText, FolderOpen, Hash, ListRestart, TerminalSquare, Wifi } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import type { InstanceRuntimeState, ServerInstanceConfig } from '../../shared/types';
import { StatusBadge } from './StatusBadge';
import { TypeBadge } from './TypeBadge';

interface InstanceOverviewProps {
  server: ServerInstanceConfig;
  state: InstanceRuntimeState;
}

interface DetailItem {
  label: string;
  value: string;
  copy?: boolean;
  mono?: boolean;
}

function formatUptime(seconds?: number): string {
  if (typeof seconds !== 'number') {
    return '-';
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${rest}s`;
  }
  return `${minutes}m ${rest}s`;
}

function formatDateTime(value?: string): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

function booleanLabel(value?: boolean): string {
  return value ? '已开启' : '未开启';
}

const STATUS_LABEL: Record<InstanceRuntimeState['status'], string> = {
  running: '运行中',
  stopped: '已停止',
  starting: '启动中',
  stopping: '停止中',
  restarting: '重启中',
  crashed: '崩溃',
  error: '错误'
};

function DetailRow({ item, onCopy }: { item: DetailItem; onCopy(value: string, label: string): void }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:grid-cols-[120px_1fr] sm:gap-4">
      <dt className="text-xs font-semibold text-slate-500">{item.label}</dt>
      <dd className="flex min-w-0 items-center gap-2 text-sm text-slate-800">
        <span className={`${item.mono ? 'font-mono text-xs' : ''} min-w-0 flex-1 break-all`}>{item.value || '-'}</span>
        {item.copy && item.value && item.value !== '-' && (
          <button
            type="button"
            className="square-button h-7 w-7 shrink-0"
            aria-label={`复制${item.label}`}
            title={`复制${item.label}`}
            onClick={() => onCopy(item.value, item.label)}
          >
            <Copy size={13} />
          </button>
        )}
      </dd>
    </div>
  );
}

function SummaryTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>
      <div className="mt-2 truncate text-base font-semibold text-slate-950" title={value}>
        {value}
      </div>
    </div>
  );
}

function DetailSection({
  title,
  icon,
  items,
  onCopy
}: {
  title: string;
  icon: ReactNode;
  items: DetailItem[];
  onCopy(value: string, label: string): void;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <span className="text-slate-500">{icon}</span>
        <h2 className="font-semibold text-slate-950">{title}</h2>
      </div>
      <dl className="px-4">
        {items.map((item) => (
          <DetailRow key={item.label} item={item} onCopy={onCopy} />
        ))}
      </dl>
    </section>
  );
}

export function InstanceOverview({ server, state }: InstanceOverviewProps) {
  const [copyHint, setCopyHint] = useState('');
  const launchCommand = useMemo(() => [server.command, ...server.args].filter(Boolean).join(' '), [server.args, server.command]);

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyHint(`已复制${label}`);
    } catch {
      setCopyHint('复制失败，请手动选择文本');
    }
    window.setTimeout(() => setCopyHint(''), 1800);
  };

  const runtimeItems: DetailItem[] = [
    { label: '实例 ID', value: server.id, copy: true, mono: true },
    { label: '进程 PID', value: state.pid ? String(state.pid) : '-' },
    { label: '启动时间', value: formatDateTime(state.startedAt) },
    { label: '运行时长', value: formatUptime(state.uptimeSeconds) },
    { label: '上次退出码', value: typeof state.lastExitCode === 'number' ? String(state.lastExitCode) : '-' },
    { label: '手动停止', value: state.manualStop ? '是' : '否' }
  ];

  const processItems: DetailItem[] = [
    { label: '工作目录', value: server.workdir, copy: true, mono: true },
    { label: '启动命令', value: launchCommand || server.command, copy: true, mono: true },
    { label: '停止命令', value: server.stopCommand || '-', copy: Boolean(server.stopCommand), mono: true },
    { label: '日志路径', value: server.logFile || '-', copy: Boolean(server.logFile), mono: true }
  ];

  const policyItems: DetailItem[] = [
    { label: '启用状态', value: server.enabled ? '已启用' : '已禁用' },
    { label: '自动重启', value: booleanLabel(server.autoRestart) },
    { label: '启动延迟', value: `${server.startupDelaySeconds}s` },
    { label: '停服超时', value: `${server.shutdownTimeoutSeconds}s` }
  ];

  return (
    <section className="min-h-0 flex-1 overflow-auto pb-2">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <SummaryTile icon={<Hash size={15} />} label="状态" value={STATUS_LABEL[state.status]} />
        <SummaryTile icon={<TerminalSquare size={15} />} label="PID" value={state.pid ? String(state.pid) : '-'} />
        <SummaryTile icon={<Clock size={15} />} label="运行时长" value={formatUptime(state.uptimeSeconds)} />
      </div>

      <div className="mb-4 panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={state.status} />
          <TypeBadge server={server} />
          {server.enabled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 size={13} />
              面板已启用
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              面板已禁用
            </span>
          )}
        </div>
        <div className="text-xs font-medium text-slate-500">{copyHint || `创建于 ${formatDateTime(server.createdAt)}`}</div>
      </div>

      {state.lastError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.lastError}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailSection title="运行状态" icon={<Wifi size={16} />} items={runtimeItems} onCopy={copyText} />
        <DetailSection title="进程配置" icon={<FolderOpen size={16} />} items={processItems} onCopy={copyText} />
        <DetailSection title="生命周期" icon={<ListRestart size={16} />} items={policyItems} onCopy={copyText} />
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
        <FileText className="mr-2 inline-block align-[-3px]" size={15} />
        这里仅展示并管理已经接入的实例配置，不生成服务端文件，也不会自动改写你的服务端目录。
      </div>
    </section>
  );
}

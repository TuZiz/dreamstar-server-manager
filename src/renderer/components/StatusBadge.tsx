import type { InstanceStatus } from '../../shared/types';

const STATUS_META: Record<InstanceStatus, { label: string; className: string }> = {
  running: { label: '运行中', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  stopped: { label: '已停止', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
  starting: { label: '启动中', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
  stopping: { label: '停止中', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  restarting: { label: '重启中', className: 'bg-violet-50 text-violet-700 ring-violet-200' },
  crashed: { label: '崩溃', className: 'bg-red-50 text-red-700 ring-red-200' },
  error: { label: '错误', className: 'bg-red-50 text-red-700 ring-red-200' }
};

export function StatusBadge({ status }: { status: InstanceStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${meta.className}`}>
      {meta.label}
    </span>
  );
}

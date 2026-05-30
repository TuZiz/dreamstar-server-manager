import type { ServerInstanceConfig } from '../../shared/types';

export function TypeBadge({ server }: { server: ServerInstanceConfig }) {
  const label =
    server.type === 'minecraft'
      ? 'MC Java 版服务端'
      : server.type === 'velocity'
        ? 'Velocity 代理'
        : server.type === 'database-process'
          ? '数据库进程'
          : '通用控制台程序';
  return (
    <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
      {label}
    </span>
  );
}

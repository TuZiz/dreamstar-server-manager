import { Database, KeyRound } from 'lucide-react';
import type { DatabaseConnectionConfig } from '../../shared/types';

interface DatabaseTreeProps {
  databases: DatabaseConnectionConfig[];
  selectedId?: string;
  onSelect(id: string): void;
}

export function DatabaseTree({ databases, selectedId, onSelect }: DatabaseTreeProps) {
  return (
    <aside className="panel w-full p-3 lg:w-72">
      <div className="mb-3 px-2 text-xs font-semibold uppercase text-slate-500">连接</div>
      <div className="space-y-1">
        {databases.length === 0 && <p className="px-2 py-6 text-sm text-slate-500">还没有数据库连接</p>}
        {databases.map((database) => (
          <button
            key={database.id}
            type="button"
            onClick={() => onSelect(database.id)}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
              selectedId === database.id ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {database.type === 'redis' ? <KeyRound size={16} /> : <Database size={16} />}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{database.name}</span>
              <span className={`block truncate text-xs ${selectedId === database.id ? 'text-slate-300' : 'text-slate-500'}`}>
                {database.type} · {database.host}:{database.port}
              </span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

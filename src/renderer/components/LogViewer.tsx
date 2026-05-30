import { Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LogEntry } from '../../shared/types';

interface LogViewerProps {
  logs: LogEntry[];
  onClear(): void;
}

function lineClass(entry: LogEntry): string {
  const text = entry.message;
  if (entry.stream === 'stderr' || /error|exception|timed out|failed/i.test(text)) {
    return 'text-red-300';
  }
  if (/warn/i.test(text)) {
    return 'text-amber-200';
  }
  if (/done|info|started/i.test(text)) {
    return 'text-emerald-200';
  }
  if (entry.stream === 'command') {
    return 'text-sky-200';
  }
  if (entry.stream === 'system') {
    return 'text-slate-300';
  }
  return 'text-slate-100';
}

export function LogViewer({ logs, onClear }: LogViewerProps) {
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const visibleLogs = useMemo(() => {
    if (!search.trim()) {
      return logs;
    }
    const keyword = search.trim().toLowerCase();
    return logs.filter((entry) => entry.message.toLowerCase().includes(keyword));
  }, [logs, search]);

  useEffect(() => {
    if (!paused) {
      bottomRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [visibleLogs, paused]);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-2">
          <Search size={15} className="text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            placeholder="搜索日志"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input className="form-checkbox" type="checkbox" checked={paused} onChange={(event) => setPaused(event.target.checked)} />
          暂停滚动
        </label>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-700 px-2 text-xs text-slate-200 hover:bg-slate-800"
          onClick={onClear}
        >
          <Trash2 size={14} />
          清屏
        </button>
      </div>
      <div className="terminal-scrollbar min-h-0 flex-1 overflow-auto px-4 py-3 font-mono text-[13px] leading-6">
        {visibleLogs.length === 0 ? (
          <p className="text-slate-500">暂无日志</p>
        ) : (
          visibleLogs.map((entry, index) => (
            <div key={`${entry.time}-${index}`} className={lineClass(entry)}>
              <span className="mr-2 text-slate-500">{new Date(entry.time).toLocaleTimeString()}</span>
              <span>{entry.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}

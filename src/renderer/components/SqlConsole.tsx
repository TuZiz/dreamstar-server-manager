import { Play, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import type { SqlQueryResult } from '../../shared/types';

interface SqlConsoleProps {
  disabled?: boolean;
  onExecute(sql: string, confirmDanger?: boolean): Promise<SqlQueryResult>;
}

const DANGER_SQL = /^(insert|update|delete|drop|truncate|alter|create|grant|revoke)\b/i;

export function SqlConsole({ disabled, onExecute }: SqlConsoleProps) {
  const [sql, setSql] = useState('SELECT 1;');
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const execute = async () => {
    setError('');
    const danger = DANGER_SQL.test(sql.trim());
    if (danger && !window.confirm('这是危险 SQL 操作，确认执行吗？')) {
      return;
    }
    setBusy(true);
    try {
      setResult(await onExecute(sql, danger));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel flex min-h-[360px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="font-semibold text-slate-950">SQL 控制台</h3>
          <p className="text-xs text-slate-500">SELECT 可直接执行，危险语句会二次确认。</p>
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void execute()}
          disabled={disabled || busy || !sql.trim()}
        >
          <Play size={15} />
          执行
        </button>
      </div>
      <textarea
        value={sql}
        onChange={(event) => setSql(event.target.value)}
        className="min-h-28 resize-y border-b border-slate-200 p-4 font-mono text-sm outline-none"
        spellCheck={false}
      />
      {error && (
        <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
          <ShieldAlert size={16} />
          {error}
        </div>
      )}
      {result?.warning && (
        <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-sm text-amber-800">{result.warning}</div>
      )}
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {!result ? (
          <p className="text-sm text-slate-500">执行后在这里显示结果。</p>
        ) : (
          <>
            <div className="mb-3 text-xs text-slate-500">
              {result.rowCount} 行 · {result.elapsedMs} ms
            </div>
            {result.columns.length === 0 ? (
              <p className="text-sm text-slate-600">语句执行完成。</p>
            ) : (
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {result.columns.map((column) => (
                      <th key={column} className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {result.columns.map((column) => (
                        <td key={column} className="max-w-[280px] truncate border border-slate-200 px-3 py-2">
                          {String(row[column] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </section>
  );
}

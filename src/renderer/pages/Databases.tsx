import { KeyRound, Plus, Save, ShieldAlert, TestTube2, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { DatabaseConnectionConfig, DatabaseType, RedisKeyDetails } from '../../shared/types';
import { DatabaseTree } from '../components/DatabaseTree';
import { FormField } from '../components/FormField';
import { SqlConsole } from '../components/SqlConsole';
import { useDatabaseStore } from '../stores/useDatabaseStore';

const defaultPorts: Record<DatabaseType, number> = {
  mysql: 3306,
  postgres: 5432,
  redis: 6379
};

function emptyForm(): Omit<DatabaseConnectionConfig, 'createdAt' | 'updatedAt'> {
  return {
    id: '',
    name: '',
    type: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    username: '',
    password: '',
    database: '',
    redisDb: 0,
    ssl: false,
    enabled: true
  };
}

export function Databases() {
  const store = useDatabaseStore();
  const [selectedId, setSelectedId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selected = useMemo(
    () => store.databases.find((database) => database.id === selectedId),
    [store.databases, selectedId]
  );

  useEffect(() => {
    if (!selectedId && store.databases[0]) {
      setSelectedId(store.databases[0].id);
    }
  }, [store.databases, selectedId]);

  const patch = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  const select = (id: string) => {
    setSelectedId(id);
    const database = store.databases.find((item) => item.id === id);
    if (database) {
      setEditingId(id);
      setForm({ ...database });
    }
  };

  const run = async (action: () => Promise<void>, ok: string) => {
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(ok);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    await run(async () => {
      if (editingId) {
        await store.update(editingId, form);
        setSelectedId(editingId);
      } else {
        await store.create(form);
        setSelectedId(form.id);
        setEditingId(form.id);
      }
    }, '连接已保存');
  };

  const remove = async () => {
    if (!selectedId || !window.confirm('确认删除该数据库连接吗？')) {
      return;
    }
    await run(async () => {
      await store.delete(selectedId);
      setSelectedId('');
      setEditingId(null);
      setForm(emptyForm());
    }, '连接已删除');
  };

  return (
    <div className="p-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">数据库管理</h1>
          <p className="mt-1 text-sm text-slate-600">添加 MySQL、PostgreSQL、Redis 连接，测试连接并执行基础查询。</p>
        </div>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold"
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm());
          }}
        >
          <Plus size={16} />
          新建连接
        </button>
      </header>

      {(message || error) && (
        <div className={`mb-5 rounded-md border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      <div className="flex flex-col gap-5 lg:flex-row">
        <DatabaseTree databases={store.databases} selectedId={selectedId} onSelect={select} />
        <div className="min-w-0 flex-1 space-y-5">
          <section className="panel p-5">
            <form className="space-y-4" onSubmit={(event) => void save(event)}>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="名称">
                  <input className="form-input" value={form.name} onChange={(event) => patch({ name: event.target.value })} required />
                </FormField>
                <FormField label="ID">
                  <input className="form-input" value={form.id} onChange={(event) => patch({ id: event.target.value })} disabled={Boolean(editingId)} required />
                </FormField>
                <FormField label="类型">
                  <select
                    className="form-input"
                    value={form.type}
                    onChange={(event) => {
                      const nextType = event.target.value as DatabaseType;
                      patch({ type: nextType, port: defaultPorts[nextType] });
                    }}
                  >
                    <option value="mysql">MySQL / MariaDB</option>
                    <option value="postgres">PostgreSQL</option>
                    <option value="redis">Redis</option>
                  </select>
                </FormField>
                <FormField label="Host">
                  <input className="form-input" value={form.host} onChange={(event) => patch({ host: event.target.value })} required />
                </FormField>
                <FormField label="Port">
                  <input className="form-input" type="number" value={form.port} onChange={(event) => patch({ port: Number(event.target.value) })} required />
                </FormField>
                <FormField label="Database / Redis DB">
                  {form.type === 'redis' ? (
                    <input className="form-input" type="number" value={form.redisDb ?? 0} onChange={(event) => patch({ redisDb: Number(event.target.value) })} />
                  ) : (
                    <input className="form-input" value={form.database} onChange={(event) => patch({ database: event.target.value })} />
                  )}
                </FormField>
                <FormField label="Username">
                  <input className="form-input" value={form.username} onChange={(event) => patch({ username: event.target.value })} />
                </FormField>
                <FormField label="Password">
                  <input className="form-input" type="password" value={form.password} onChange={(event) => patch({ password: event.target.value })} />
                </FormField>
                <div className="flex items-end gap-5 pb-2 text-sm text-slate-700">
                  <label className="flex items-center gap-2">
                    <input className="form-checkbox" type="checkbox" checked={form.ssl} onChange={(event) => patch({ ssl: event.target.checked })} />
                    SSL
                  </label>
                  <label className="flex items-center gap-2">
                    <input className="form-checkbox" type="checkbox" checked={form.enabled} onChange={(event) => patch({ enabled: event.target.checked })} />
                    启用
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <div className="flex gap-2">
                  <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">
                    <Save size={16} />
                    保存
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold"
                    disabled={!selectedId}
                    onClick={() => selectedId && void run(() => store.testConnection(selectedId), '连接测试成功')}
                  >
                    <TestTube2 size={16} />
                    测试连接
                  </button>
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 disabled:opacity-50"
                  disabled={!selectedId}
                  onClick={() => void remove()}
                >
                  <Trash2 size={16} />
                  删除
                </button>
              </div>
            </form>
          </section>

          {selected?.type === 'redis' ? (
            <RedisPanel selectedId={selectedId} />
          ) : selected ? (
            <SqlConsole disabled={!selectedId} onExecute={(sql, confirmDanger) => store.executeSql(selectedId, sql, confirmDanger)} />
          ) : (
            <section className="panel p-8 text-sm text-slate-500">请选择或创建一个数据库连接。</section>
          )}
        </div>
      </div>
    </div>
  );
}

function RedisPanel({ selectedId }: { selectedId: string }) {
  const store = useDatabaseStore();
  const [pattern, setPattern] = useState('*');
  const [keys, setKeys] = useState<string[]>([]);
  const [details, setDetails] = useState<RedisKeyDetails | null>(null);
  const [command, setCommand] = useState('PING');
  const [commandResult, setCommandResult] = useState<unknown>(null);
  const [error, setError] = useState('');

  const safeRun = async (action: () => Promise<void>) => {
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound size={18} />
        <h3 className="font-semibold text-slate-950">Redis Key 管理</h3>
      </div>
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      <div className="flex gap-2">
        <input className="form-input" value={pattern} onChange={(event) => setPattern(event.target.value)} placeholder="huskhomes:*" />
        <button
          type="button"
          className="h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white"
          onClick={() => void safeRun(async () => setKeys(await store.redisSearchKeys(selectedId, pattern)))}
        >
          搜索
        </button>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="max-h-72 overflow-auto rounded-md border border-slate-200">
          {keys.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">暂无 key</p>
          ) : (
            keys.map((key) => (
              <button
                type="button"
                key={key}
                className="block w-full truncate border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => void safeRun(async () => setDetails(await store.redisGetKey(selectedId, key)))}
              >
                {key}
              </button>
            ))
          )}
        </div>
        <div className="min-h-72 rounded-md border border-slate-200 bg-slate-50 p-4">
          {details ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-sm font-semibold text-slate-900">{details.key}</div>
                  <div className="text-xs text-slate-500">
                    {details.type} · TTL {details.ttl}
                  </div>
                </div>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-600"
                  onClick={() =>
                    void safeRun(async () => {
                      if (!window.confirm('确认删除该 Redis key 吗？')) return;
                      await store.redisDeleteKey(selectedId, details.key, true);
                      setDetails(null);
                      setKeys((items) => items.filter((item) => item !== details.key));
                    })
                  }
                >
                  <ShieldAlert size={15} />
                  删除
                </button>
              </div>
              <pre className="max-h-56 overflow-auto rounded-md bg-white p-3 text-xs text-slate-800">
                {JSON.stringify(details.value, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-slate-500">选择一个 key 查看详情。</p>
          )}
        </div>
      </div>
      <div className="mt-5">
        <div className="flex gap-2">
          <input className="form-input font-mono" value={command} onChange={(event) => setCommand(event.target.value)} />
          <button
            type="button"
            className="h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white"
            onClick={() =>
              void safeRun(async () => {
                const danger = /^(del|flushdb|flushall|config|shutdown|eval)\b/i.test(command.trim());
                if (danger && !window.confirm('这是危险 Redis 命令，确认执行吗？')) return;
                setCommandResult(await store.redisExecuteCommand(selectedId, command, danger));
              })
            }
          >
            执行
          </button>
        </div>
        {commandResult !== null && (
          <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
            {JSON.stringify(commandResult, null, 2)}
          </pre>
        )}
      </div>
    </section>
  );
}

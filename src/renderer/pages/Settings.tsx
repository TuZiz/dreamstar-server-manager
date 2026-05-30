import { Download, FolderOpen, Save, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AppSettings } from '../../shared/types';
import { FormField } from '../components/FormField';
import { useDatabaseStore } from '../stores/useDatabaseStore';
import { useServerStore } from '../stores/useServerStore';
import { useSettingsStore } from '../stores/useSettingsStore';

export function SettingsPage() {
  const { settings, load, update } = useSettingsStore();
  const servers = useServerStore((state) => state.servers);
  const databases = useDatabaseStore((state) => state.databases);
  const [draft, setDraft] = useState<AppSettings | null>(settings ?? null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (settings) {
      setDraft(settings);
    }
  }, [settings]);

  const patch = (patch: Partial<AppSettings>) => {
    setDraft((current) => ({ ...(current ?? defaultSettings()), ...patch }));
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

  if (!draft) {
    return <div className="p-6 text-sm text-slate-500">正在加载设置...</div>;
  }

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-950">设置</h1>
        <p className="mt-1 text-sm text-slate-600">管理启动顺序、路径、主题和配置导入导出。</p>
      </header>

      {(message || error) && (
        <div className={`mb-5 rounded-md border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="panel p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-950">实例顺序</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="启动顺序" hint="用英文逗号分隔实例 ID">
              <textarea
                className="form-input h-28 py-2"
                value={draft.startupOrder.join(', ')}
                onChange={(event) => patch({ startupOrder: splitIds(event.target.value) })}
              />
            </FormField>
            <FormField label="关闭顺序" hint="用英文逗号分隔实例 ID">
              <textarea
                className="form-input h-28 py-2"
                value={draft.shutdownOrder.join(', ')}
                onChange={(event) => patch({ shutdownOrder: splitIds(event.target.value) })}
              />
            </FormField>
          </div>

          <h2 className="mb-4 mt-8 text-base font-semibold text-slate-950">路径配置</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <PathField label="默认服务器目录" value={draft.defaultServerRoot ?? ''} onChange={(value) => patch({ defaultServerRoot: value })} directory />
            <PathField label="备份目录" value={draft.backupDirectory ?? ''} onChange={(value) => patch({ backupDirectory: value })} directory />
            <PathField label="mysqldump.exe" value={draft.mysqlDumpPath ?? ''} onChange={(value) => patch({ mysqlDumpPath: value })} />
            <PathField label="pg_dump.exe" value={draft.pgDumpPath ?? ''} onChange={(value) => patch({ pgDumpPath: value })} />
          </div>

          <h2 className="mb-4 mt-8 text-base font-semibold text-slate-950">主题</h2>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
              <input className="form-checkbox" type="radio" checked={draft.theme === 'light'} onChange={() => patch({ theme: 'light' })} />
              浅色
            </label>
            <label className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-400">
              <input className="form-checkbox" type="radio" checked={draft.theme === 'dark'} onChange={() => patch({ theme: 'dark' })} />
              深色预留
            </label>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white"
              onClick={() => void run(() => update(draft), '设置已保存')}
            >
              <Save size={16} />
              保存设置
            </button>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="panel p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-950">当前配置</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">实例数量</dt>
                <dd className="font-semibold text-slate-900">{servers.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">数据库连接</dt>
                <dd className="font-semibold text-slate-900">{databases.length}</dd>
              </div>
              <div>
                <dt className="mb-1 text-slate-500">实例 ID</dt>
                <dd className="text-xs leading-6 text-slate-700">{servers.map((server) => server.id).join(', ') || '-'}</dd>
              </div>
            </dl>
          </section>

          <section className="panel p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-950">配置导入导出</h2>
            <p className="mb-4 text-sm leading-6 text-slate-600">导出的配置可能包含数据库密码。脱敏导出会移除 password 字段。</p>
            <div className="grid gap-2">
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold"
                onClick={() => void run(exportSanitizedConfig, '脱敏配置已复制到剪贴板')}
              >
                <Download size={16} />
                导出不含密码版本
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-400"
                disabled
              >
                <Upload size={16} />
                导入配置预留
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PathField({
  label,
  value,
  directory,
  onChange
}: {
  label: string;
  value: string;
  directory?: boolean;
  onChange(value: string): void;
}) {
  const select = async () => {
    const selected = directory
      ? await window.dreamstar.system.selectDirectory()
      : await window.dreamstar.system.selectFile({ title: label, filters: [{ name: 'Executable', extensions: ['exe', '*'] }] });
    if (selected) onChange(selected);
  };

  return (
    <FormField label={label}>
      <div className="flex gap-2">
        <input className="form-input" value={value} onChange={(event) => onChange(event.target.value)} />
        <button type="button" className="square-button h-10 w-10 shrink-0" onClick={() => void select()} aria-label={`选择${label}`}>
          <FolderOpen size={17} />
        </button>
      </div>
    </FormField>
  );
}

function splitIds(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function defaultSettings(): AppSettings {
  return {
    startupOrder: [],
    shutdownOrder: [],
    theme: 'light',
    defaultServerRoot: '',
    backupDirectory: '',
    mysqlDumpPath: '',
    pgDumpPath: ''
  };
}

async function exportSanitizedConfig(): Promise<void> {
  const config = await window.dreamstar.config.getConfig();
  const sanitized = {
    ...config,
    databases: config.databases.map(({ password: _password, ...database }) => database)
  };
  await navigator.clipboard.writeText(JSON.stringify(sanitized, null, 2));
}

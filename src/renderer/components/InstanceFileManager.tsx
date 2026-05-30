import { ChevronLeft, FileText, Folder, RefreshCw, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { InstanceFileEntry, InstanceTextFile, ServerInstanceConfig } from '../../shared/types';

interface InstanceFileManagerProps {
  server: ServerInstanceConfig;
}

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function parentPath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

function isLikelyEditable(entry: InstanceFileEntry): boolean {
  return /\.(txt|log|json|yml|yaml|toml|properties|conf|cfg|ini|bat|cmd|sh|md)$/i.test(entry.name);
}

export function InstanceFileManager({ server }: InstanceFileManagerProps) {
  const [currentPath, setCurrentPath] = useState('');
  const [entries, setEntries] = useState<InstanceFileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<InstanceTextFile | null>(null);
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const titlePath = useMemo(() => currentPath || '.', [currentPath]);

  const load = async (path = currentPath) => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      setEntries(await window.dreamstar.servers.listFiles(server.id, path));
      setCurrentPath(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load('');
    setSelectedFile(null);
    setContent('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server.id]);

  const openEntry = async (entry: InstanceFileEntry) => {
    setError('');
    setMessage('');
    if (entry.type === 'directory') {
      setSelectedFile(null);
      setContent('');
      await load(entry.relativePath);
      return;
    }
    if (!isLikelyEditable(entry)) {
      setError('当前只支持打开常见文本配置文件。');
      return;
    }
    try {
      const file = await window.dreamstar.servers.readTextFile(server.id, entry.relativePath);
      setSelectedFile(file);
      setContent(file.content);
      if (file.truncated) {
        setMessage('文件超过 1MB，仅显示前 1MB，保存会覆盖完整文件，请谨慎。');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const save = async () => {
    if (!selectedFile) return;
    setError('');
    setMessage('');
    try {
      await window.dreamstar.servers.writeTextFile(server.id, selectedFile.relativePath, content);
      setMessage('文件已保存');
      await load(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[360px_1fr]">
      <aside className="panel flex min-h-0 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-950">工作目录文件</h2>
            <p className="truncate text-xs text-slate-500">{titlePath}</p>
          </div>
          <button className="square-button h-8 w-8" type="button" onClick={() => void load()} aria-label="刷新文件列表">
            <RefreshCw size={15} />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
          <button
            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium disabled:opacity-50"
            type="button"
            disabled={!currentPath}
            onClick={() => void load(parentPath(currentPath))}
          >
            <ChevronLeft size={14} />
            上级
          </button>
          <span className="truncate text-xs text-slate-500">{server.workdir}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <p className="p-4 text-sm text-slate-500">正在读取文件...</p>
          ) : entries.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">目录为空</p>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.relativePath}
                type="button"
                className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
                onClick={() => void openEntry(entry)}
              >
                <span className={entry.type === 'directory' ? 'text-amber-600' : 'text-slate-500'}>
                  {entry.type === 'directory' ? <Folder size={18} /> : <FileText size={18} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">{entry.name}</span>
                  <span className="block text-xs text-slate-500">
                    {entry.type === 'directory' ? '文件夹' : formatSize(entry.size)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="panel flex min-h-0 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-950">文本编辑</h2>
            <p className="truncate text-xs text-slate-500">{selectedFile?.relativePath ?? '选择一个文本配置文件'}</p>
          </div>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={!selectedFile}
            onClick={() => void save()}
          >
            <Save size={15} />
            保存
          </button>
        </div>

        {(error || message) && (
          <div className={`border-b px-4 py-2 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {error || message}
          </div>
        )}

        {selectedFile ? (
          <textarea
            className="min-h-0 flex-1 resize-none p-4 font-mono text-sm leading-6 outline-none"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            spellCheck={false}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500">
            选择 `server.properties`、`velocity.toml`、`config.yml`、日志或脚本等文本文件进行查看和编辑。
          </div>
        )}
      </section>
    </section>
  );
}

import { FolderOpen, Save } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CustomProcessCreateInput } from '../../shared/types';
import { CreateServerWizard } from '../components/CreateServerWizard';
import { FormField } from '../components/FormField';
import { useServerStore } from '../stores/useServerStore';

export function CreateCustomProcess() {
  const navigate = useNavigate();
  const createCustom = useServerStore((state) => state.createCustom);
  const [error, setError] = useState('');
  const [form, setForm] = useState<CustomProcessCreateInput>({
    id: '',
    name: '',
    workdir: '',
    createDirectory: true,
    command: '',
    argsText: '',
    stopCommand: '',
    autoRestart: false,
    startupDelaySeconds: 0,
    shutdownTimeoutSeconds: 20,
    logFile: '',
    group: ''
  });

  const patch = (patch: Partial<CustomProcessCreateInput>) => setForm((current) => ({ ...current, ...patch }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await createCustom(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="p-6">
      <CreateServerWizard title="添加自定义控制台程序" description="用于支付后端、脚本服务、MCP 等普通控制台进程。停止命令不会默认发送 Minecraft 的 stop。">
        <form className="space-y-6" onSubmit={(event) => void submit(event)}>
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="名称">
              <input className="form-input" value={form.name} onChange={(event) => patch({ name: event.target.value })} required />
            </FormField>
            <FormField label="ID">
              <input className="form-input" value={form.id} onChange={(event) => patch({ id: event.target.value })} required />
            </FormField>
            <FormField label="工作目录">
              <div className="flex gap-2">
                <input className="form-input" value={form.workdir} onChange={(event) => patch({ workdir: event.target.value })} required />
                <button type="button" className="square-button h-10 w-10 shrink-0" onClick={() => void window.dreamstar.system.selectDirectory().then((path) => path && patch({ workdir: path }))}>
                  <FolderOpen size={17} />
                </button>
              </div>
            </FormField>
            <FormField label="分组">
              <input className="form-input" value={form.group} onChange={(event) => patch({ group: event.target.value })} />
            </FormField>
            <FormField label="命令">
              <input className="form-input" value={form.command} onChange={(event) => patch({ command: event.target.value })} placeholder="node / java / python / your-app.exe" required />
            </FormField>
            <FormField label="参数">
              <input className="form-input" value={form.argsText} onChange={(event) => patch({ argsText: event.target.value })} />
            </FormField>
            <FormField label="停止命令">
              <input className="form-input" value={form.stopCommand} onChange={(event) => patch({ stopCommand: event.target.value })} placeholder="可留空" />
            </FormField>
            <FormField label="日志路径">
              <input className="form-input" value={form.logFile} onChange={(event) => patch({ logFile: event.target.value })} />
            </FormField>
            <FormField label="启动延迟秒">
              <input className="form-input" type="number" value={form.startupDelaySeconds} onChange={(event) => patch({ startupDelaySeconds: Number(event.target.value) })} />
            </FormField>
            <FormField label="关闭超时秒">
              <input className="form-input" type="number" value={form.shutdownTimeoutSeconds} onChange={(event) => patch({ shutdownTimeoutSeconds: Number(event.target.value) })} />
            </FormField>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input className="form-checkbox" type="checkbox" checked={form.autoRestart} onChange={(event) => patch({ autoRestart: event.target.checked })} />
              意外退出后自动重启
            </label>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">
              <Save size={16} />
              保存进程
            </button>
          </div>
        </form>
      </CreateServerWizard>
    </div>
  );
}

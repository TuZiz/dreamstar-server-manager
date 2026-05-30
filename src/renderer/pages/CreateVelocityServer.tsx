import { File, FolderOpen, Save } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { VelocityServerCreateInput } from '../../shared/types';
import { CreateServerWizard } from '../components/CreateServerWizard';
import { FormField } from '../components/FormField';
import { useServerStore } from '../stores/useServerStore';

export function CreateVelocityServer() {
  const navigate = useNavigate();
  const createVelocity = useServerStore((state) => state.createVelocity);
  const [error, setError] = useState('');
  const [form, setForm] = useState<VelocityServerCreateInput>({
    id: '',
    name: '',
    workdir: '',
    createDirectory: true,
    group: 'proxy',
    jarSourcePath: '',
    copyJar: true,
    jarFileName: 'velocity.jar',
    javaPath: 'java',
    minMemory: '512M',
    maxMemory: '1G',
    bindAddress: '0.0.0.0',
    port: 25565,
    onlineMode: true,
    forwardingMode: 'modern',
    forwardingSecret: '',
    generateForwardingSecret: true,
    autoRestart: false,
    startupDelaySeconds: 0,
    shutdownTimeoutSeconds: 30
  });

  const patch = (patch: Partial<VelocityServerCreateInput>) => setForm((current) => ({ ...current, ...patch }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await createVelocity(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="p-6">
      <CreateServerWizard title="创建 Velocity 代理" description="创建代理实例并生成 velocity.toml、forwarding.secret 和基础启动命令。">
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
            <FormField label="velocity.jar">
              <div className="flex gap-2">
                <input className="form-input" value={form.jarSourcePath} onChange={(event) => patch({ jarSourcePath: event.target.value })} />
                <button type="button" className="square-button h-10 w-10 shrink-0" onClick={() => void window.dreamstar.system.selectFile({ filters: [{ name: 'Java Archive', extensions: ['jar'] }] }).then((path) => path && patch({ jarSourcePath: path }))}>
                  <File size={17} />
                </button>
              </div>
            </FormField>
            <FormField label="目标 jar 文件名">
              <input className="form-input" value={form.jarFileName} onChange={(event) => patch({ jarFileName: event.target.value })} />
            </FormField>
            <FormField label="Java 路径">
              <input className="form-input" value={form.javaPath} onChange={(event) => patch({ javaPath: event.target.value })} />
            </FormField>
            <FormField label="Xms / Xmx">
              <div className="grid grid-cols-2 gap-2">
                <input className="form-input" value={form.minMemory} onChange={(event) => patch({ minMemory: event.target.value })} />
                <input className="form-input" value={form.maxMemory} onChange={(event) => patch({ maxMemory: event.target.value })} />
              </div>
            </FormField>
            <FormField label="监听地址">
              <input className="form-input" value={form.bindAddress} onChange={(event) => patch({ bindAddress: event.target.value })} />
            </FormField>
            <FormField label="监听端口">
              <input className="form-input" type="number" value={form.port} onChange={(event) => patch({ port: Number(event.target.value) })} />
            </FormField>
            <FormField label="转发模式">
              <select className="form-input" value={form.forwardingMode} onChange={(event) => patch({ forwardingMode: event.target.value as VelocityServerCreateInput['forwardingMode'] })}>
                <option value="none">none</option>
                <option value="legacy">legacy</option>
                <option value="bungeeguard">bungeeguard</option>
                <option value="modern">modern</option>
              </select>
            </FormField>
            <FormField label="forwarding secret">
              <input className="form-input" value={form.forwardingSecret} onChange={(event) => patch({ forwardingSecret: event.target.value })} disabled={form.generateForwardingSecret} />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input className="form-checkbox" type="checkbox" checked={form.createDirectory} onChange={(event) => patch({ createDirectory: event.target.checked })} />
              自动创建目录
            </label>
            <label className="flex items-center gap-2">
              <input className="form-checkbox" type="checkbox" checked={form.copyJar} onChange={(event) => patch({ copyJar: event.target.checked })} />
              复制 jar 到工作目录
            </label>
            <label className="flex items-center gap-2">
              <input className="form-checkbox" type="checkbox" checked={form.onlineMode} onChange={(event) => patch({ onlineMode: event.target.checked })} />
              online-mode
            </label>
            <label className="flex items-center gap-2">
              <input className="form-checkbox" type="checkbox" checked={form.generateForwardingSecret} onChange={(event) => patch({ generateForwardingSecret: event.target.checked })} />
              自动生成 forwarding.secret
            </label>
            <label className="flex items-center gap-2">
              <input className="form-checkbox" type="checkbox" checked={form.autoRestart} onChange={(event) => patch({ autoRestart: event.target.checked })} />
              自动重启
            </label>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">
              <Save size={16} />
              保存代理
            </button>
          </div>
        </form>
      </CreateServerWizard>
    </div>
  );
}

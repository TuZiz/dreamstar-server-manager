import { File, FolderOpen, Save } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateServerWizard } from '../components/CreateServerWizard';
import { FormField } from '../components/FormField';
import { useServerStore } from '../stores/useServerStore';
import type { MinecraftServerCreateInput, ServerEngine, ServerPropertiesConfig } from '../../shared/types';

const defaultProperties: ServerPropertiesConfig = {
  serverPort: 25565,
  onlineMode: true,
  motd: 'DreamStar Server',
  maxPlayers: 2026,
  viewDistance: 10,
  simulationDistance: 10,
  enableCommandBlock: false,
  allowFlight: false,
  difficulty: 'normal',
  gamemode: 'survival',
  pvp: true,
  spawnProtection: 16
};

export function CreateMinecraftServer() {
  const navigate = useNavigate();
  const createMinecraft = useServerStore((state) => state.createMinecraft);
  const [error, setError] = useState('');
  const [form, setForm] = useState<MinecraftServerCreateInput>({
    id: '',
    name: '',
    workdir: '',
    createDirectory: true,
    group: '',
    engine: 'purpur',
    jarSourcePath: '',
    copyJar: true,
    jarFileName: 'purpur.jar',
    javaPath: 'java',
    minMemory: '2G',
    maxMemory: '4G',
    jvmArgsText: '',
    appArgsText: '',
    nogui: true,
    autoRestart: false,
    startupDelaySeconds: 0,
    shutdownTimeoutSeconds: 30,
    logFile: 'logs/latest.log',
    eulaAccepted: false,
    serverProperties: defaultProperties,
    serverPropertiesMode: 'merge'
  });

  const patch = (patch: Partial<MinecraftServerCreateInput>) => setForm((current) => ({ ...current, ...patch }));
  const patchProperties = (patch: Partial<ServerPropertiesConfig>) =>
    setForm((current) => ({ ...current, serverProperties: { ...current.serverProperties, ...patch } }));

  const selectDirectory = async () => {
    const path = await window.dreamstar.system.selectDirectory();
    if (path) patch({ workdir: path });
  };

  const selectJar = async () => {
    const path = await window.dreamstar.system.selectFile({
      title: '选择服务端 jar',
      filters: [{ name: 'Java Archive', extensions: ['jar'] }]
    });
    if (path) patch({ jarSourcePath: path });
  };

  const selectJava = async () => {
    const path = await window.dreamstar.system.selectJavaExecutable();
    if (path) patch({ javaPath: path });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await createMinecraft(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="p-6">
      <CreateServerWizard title="创建 Minecraft 服务端" description="填写实例信息、选择 jar、生成 eula.txt 和 server.properties，保存后会出现在 Dashboard。">
        <form className="space-y-8" onSubmit={(event) => void submit(event)}>
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <section>
            <h2 className="mb-4 text-base font-semibold text-slate-950">基础信息</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="服务器名称">
                <input className="form-input" value={form.name} onChange={(event) => patch({ name: event.target.value })} required />
              </FormField>
              <FormField label="服务器 ID" hint="只允许字母、数字、短横线和下划线">
                <input className="form-input" value={form.id} onChange={(event) => patch({ id: event.target.value })} required />
              </FormField>
              <FormField label="工作目录">
                <div className="flex gap-2">
                  <input className="form-input" value={form.workdir} onChange={(event) => patch({ workdir: event.target.value })} required />
                  <button type="button" className="square-button h-10 w-10 shrink-0" onClick={() => void selectDirectory()} aria-label="选择目录">
                    <FolderOpen size={17} />
                  </button>
                </div>
              </FormField>
              <FormField label="分组">
                <input className="form-input" value={form.group} onChange={(event) => patch({ group: event.target.value })} placeholder="survival / lobby / resource" />
              </FormField>
              <FormField label="核心类型">
                <select className="form-input" value={form.engine} onChange={(event) => patch({ engine: event.target.value as Exclude<ServerEngine, 'velocity'> })}>
                  <option value="purpur">Purpur</option>
                  <option value="paper">Paper</option>
                  <option value="spigot">Spigot</option>
                  <option value="folia">Folia</option>
                  <option value="custom">Custom</option>
                </select>
              </FormField>
              <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
                <input className="form-checkbox" type="checkbox" checked={form.createDirectory} onChange={(event) => patch({ createDirectory: event.target.checked })} />
                工作目录不存在时自动创建
              </label>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-base font-semibold text-slate-950">服务端核心</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="本地 jar 文件">
                <div className="flex gap-2">
                  <input className="form-input" value={form.jarSourcePath} onChange={(event) => patch({ jarSourcePath: event.target.value })} />
                  <button type="button" className="square-button h-10 w-10 shrink-0" onClick={() => void selectJar()} aria-label="选择 jar">
                    <File size={17} />
                  </button>
                </div>
              </FormField>
              <FormField label="目标 jar 文件名">
                <input className="form-input" value={form.jarFileName} onChange={(event) => patch({ jarFileName: event.target.value })} required />
              </FormField>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input className="form-checkbox" type="checkbox" checked={form.copyJar} onChange={(event) => patch({ copyJar: event.target.checked })} />
                复制 jar 到工作目录
              </label>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-base font-semibold text-slate-950">启动参数</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Java 路径">
                <div className="flex gap-2">
                  <input className="form-input" value={form.javaPath} onChange={(event) => patch({ javaPath: event.target.value })} />
                  <button type="button" className="square-button h-10 w-10 shrink-0" onClick={() => void selectJava()} aria-label="选择 java.exe">
                    <File size={17} />
                  </button>
                </div>
              </FormField>
              <FormField label="Xms">
                <input className="form-input" value={form.minMemory} onChange={(event) => patch({ minMemory: event.target.value })} />
              </FormField>
              <FormField label="Xmx">
                <input className="form-input" value={form.maxMemory} onChange={(event) => patch({ maxMemory: event.target.value })} />
              </FormField>
              <FormField label="额外 JVM 参数">
                <input className="form-input" value={form.jvmArgsText} onChange={(event) => patch({ jvmArgsText: event.target.value })} />
              </FormField>
              <FormField label="启动参数">
                <input className="form-input" value={form.appArgsText} onChange={(event) => patch({ appArgsText: event.target.value })} />
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
              <div className="flex items-center gap-5 pt-7 text-sm text-slate-700">
                <label className="flex items-center gap-2">
                  <input className="form-checkbox" type="checkbox" checked={form.nogui} onChange={(event) => patch({ nogui: event.target.checked })} />
                  nogui
                </label>
                <label className="flex items-center gap-2">
                  <input className="form-checkbox" type="checkbox" checked={form.autoRestart} onChange={(event) => patch({ autoRestart: event.target.checked })} />
                  自动重启
                </label>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-base font-semibold text-slate-950">server.properties</h2>
            <div className="grid gap-4 md:grid-cols-4">
              <FormField label="端口">
                <input className="form-input" type="number" value={form.serverProperties.serverPort} onChange={(event) => patchProperties({ serverPort: Number(event.target.value) })} />
              </FormField>
              <FormField label="最大人数">
                <input className="form-input" type="number" value={form.serverProperties.maxPlayers} onChange={(event) => patchProperties({ maxPlayers: Number(event.target.value) })} />
              </FormField>
              <FormField label="视距">
                <input className="form-input" type="number" value={form.serverProperties.viewDistance} onChange={(event) => patchProperties({ viewDistance: Number(event.target.value) })} />
              </FormField>
              <FormField label="模拟距离">
                <input className="form-input" type="number" value={form.serverProperties.simulationDistance} onChange={(event) => patchProperties({ simulationDistance: Number(event.target.value) })} />
              </FormField>
              <FormField label="MOTD">
                <input className="form-input" value={form.serverProperties.motd} onChange={(event) => patchProperties({ motd: event.target.value })} />
              </FormField>
              <FormField label="难度">
                <select className="form-input" value={form.serverProperties.difficulty} onChange={(event) => patchProperties({ difficulty: event.target.value as ServerPropertiesConfig['difficulty'] })}>
                  <option value="peaceful">peaceful</option>
                  <option value="easy">easy</option>
                  <option value="normal">normal</option>
                  <option value="hard">hard</option>
                </select>
              </FormField>
              <FormField label="游戏模式">
                <select className="form-input" value={form.serverProperties.gamemode} onChange={(event) => patchProperties({ gamemode: event.target.value as ServerPropertiesConfig['gamemode'] })}>
                  <option value="survival">survival</option>
                  <option value="creative">creative</option>
                  <option value="adventure">adventure</option>
                  <option value="spectator">spectator</option>
                </select>
              </FormField>
              <FormField label="出生点保护">
                <input className="form-input" type="number" value={form.serverProperties.spawnProtection} onChange={(event) => patchProperties({ spawnProtection: Number(event.target.value) })} />
              </FormField>
            </div>
            <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-700">
              {[
                ['onlineMode', 'online-mode'],
                ['enableCommandBlock', '命令方块'],
                ['allowFlight', '允许飞行'],
                ['pvp', 'PVP']
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    className="form-checkbox"
                    type="checkbox"
                    checked={Boolean(form.serverProperties[key as keyof ServerPropertiesConfig])}
                    onChange={(event) => patchProperties({ [key]: event.target.checked } as Partial<ServerPropertiesConfig>)}
                  />
                  {label}
                </label>
              ))}
              <label className="flex items-center gap-2">
                <input className="form-checkbox" type="checkbox" checked={form.serverPropertiesMode === 'overwrite'} onChange={(event) => patch({ serverPropertiesMode: event.target.checked ? 'overwrite' : 'merge' })} />
                覆盖已有 server.properties
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <label className="flex items-start gap-3 text-sm text-amber-900">
              <input className="form-checkbox mt-0.5" type="checkbox" checked={form.eulaAccepted} onChange={(event) => patch({ eulaAccepted: event.target.checked })} />
              <span>我确认自己已经阅读并同意 Minecraft EULA，创建时会写入 eula.txt。</span>
            </label>
          </section>

          <div className="flex justify-end">
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">
              <Save size={16} />
              保存实例
            </button>
          </div>
        </form>
      </CreateServerWizard>
    </div>
  );
}

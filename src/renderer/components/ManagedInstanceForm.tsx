import { FolderOpen, Save } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  CustomProcessCreateInput,
  MinecraftServerCreateInput,
  ServerEngine,
  ServerInstanceConfig,
  VelocityServerCreateInput
} from '../../shared/types';
import { useServerStore } from '../stores/useServerStore';
import { FormField } from './FormField';

type ManagedKind = 'minecraft' | 'velocity' | 'custom';

interface ManagedInstanceDraft {
  id: string;
  name: string;
  type: ManagedKind;
  engine: ServerEngine;
  workdir: string;
  createDirectory: boolean;
  commandLine: string;
  stopCommand: string;
  autoRestart: boolean;
  startupDelaySeconds: number;
  shutdownTimeoutSeconds: number;
  logFile: string;
}

interface ManagedInstanceFormProps {
  kind: ManagedKind;
  title: string;
  description: string;
  submitLabel: string;
  server?: ServerInstanceConfig;
}

const typeOptions: Array<{ value: ManagedKind; label: string }> = [
  { value: 'minecraft', label: 'MC Java 版服务端' },
  { value: 'velocity', label: 'Velocity 代理' },
  { value: 'custom', label: '通用控制台程序' }
];

function defaults(kind: ManagedKind): ManagedInstanceDraft {
  if (kind === 'velocity') {
    return {
      id: '',
      name: '',
      type: 'velocity',
      engine: 'velocity',
      workdir: '',
      createDirectory: false,
      commandLine: 'java -Xms512M -Xmx1G -jar velocity.jar',
      stopCommand: 'end',
      autoRestart: false,
      startupDelaySeconds: 0,
      shutdownTimeoutSeconds: 30,
      logFile: 'logs/latest.log'
    };
  }
  if (kind === 'custom') {
    return {
      id: '',
      name: '',
      type: 'custom',
      engine: 'custom',
      workdir: '',
      createDirectory: false,
      commandLine: '',
      stopCommand: '',
      autoRestart: false,
      startupDelaySeconds: 0,
      shutdownTimeoutSeconds: 20,
      logFile: ''
    };
  }
  return {
    id: '',
    name: '',
    type: 'minecraft',
    engine: 'paper',
    workdir: '',
    createDirectory: false,
    commandLine: 'java -Xms2G -Xmx4G -jar server.jar nogui',
    stopCommand: 'stop',
    autoRestart: false,
    startupDelaySeconds: 0,
    shutdownTimeoutSeconds: 30,
    logFile: 'logs/latest.log'
  };
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}

function quotePart(value: string): string {
  if (!value) {
    return '';
  }
  return /\s/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}

function fromServer(server: ServerInstanceConfig): ManagedInstanceDraft {
  const type = server.type === 'velocity' || server.type === 'custom' ? server.type : 'minecraft';
  return {
    id: server.id,
    name: server.name,
    type,
    engine: server.engine ?? (type === 'velocity' ? 'velocity' : type === 'custom' ? 'custom' : 'paper'),
    workdir: server.workdir,
    createDirectory: false,
    commandLine: [quotePart(server.command), ...server.args.map(quotePart)].filter(Boolean).join(' '),
    stopCommand: server.stopCommand ?? '',
    autoRestart: server.autoRestart,
    startupDelaySeconds: server.startupDelaySeconds,
    shutdownTimeoutSeconds: server.shutdownTimeoutSeconds,
    logFile: server.logFile ?? ''
  };
}

export function ManagedInstanceForm({
  kind,
  title,
  description,
  submitLabel,
  server
}: ManagedInstanceFormProps) {
  const navigate = useNavigate();
  const createMinecraft = useServerStore((state) => state.createMinecraft);
  const createVelocity = useServerStore((state) => state.createVelocity);
  const createCustom = useServerStore((state) => state.createCustom);
  const updateServer = useServerStore((state) => state.update);
  const [draft, setDraft] = useState(() => (server ? fromServer(server) : defaults(kind)));
  const [error, setError] = useState('');

  const typeLabel = useMemo(
    () => typeOptions.find((option) => option.value === draft.type)?.label ?? '通用控制台程序',
    [draft.type]
  );

  const patch = (patch: Partial<ManagedInstanceDraft>) => {
    setDraft((current) => {
      const next = { ...current, ...patch };
      if (patch.type && patch.type !== current.type) {
        return { ...defaults(patch.type), name: current.name, id: current.id, workdir: current.workdir };
      }
      if (patch.name !== undefined && !current.id) {
        next.id = slug(patch.name);
      }
      if (next.type === 'velocity') {
        next.engine = 'velocity';
        if (!next.stopCommand) next.stopCommand = 'end';
      }
      if (next.type === 'minecraft' && !next.stopCommand) {
        next.stopCommand = 'stop';
      }
      return next;
    });
  };

  const selectDirectory = async () => {
    const path = await window.dreamstar.system.selectDirectory();
    if (path) patch({ workdir: path });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      if (server) {
        await updateServer(server.id, toPatch(draft));
      } else {
        const input = toInput(draft);
        if (draft.type === 'minecraft') {
          await createMinecraft(input as MinecraftServerCreateInput);
        } else if (draft.type === 'velocity') {
          await createVelocity(input as VelocityServerCreateInput);
        } else {
          await createCustom(input as CustomProcessCreateInput);
        }
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        </header>

        <form className="panel overflow-hidden" onSubmit={(event) => void submit(event)}>
          {error && <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">{error}</div>}

          <div className="grid gap-x-6 gap-y-5 p-6 xl:grid-cols-3 md:grid-cols-2">
            <FormField label="实例名称" hint="用于 Dashboard 和终端页显示，支持中文。">
              <input
                className="form-input"
                value={draft.name}
                onChange={(event) => patch({ name: event.target.value })}
                placeholder="Paper-生存一区"
                required
              />
            </FormField>

            <FormField label="实例类型" hint="用于状态卡片分类，不会生成服务端配置。">
              <select
                className="form-input"
                value={draft.type}
                onChange={(event) => patch({ type: event.target.value as ManagedKind })}
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="实例 ID" hint="自动生成后也可以手动改，需保持唯一。">
              <input
                className="form-input"
                value={draft.id}
                onChange={(event) => patch({ id: event.target.value })}
                placeholder="paper-survival-1"
                disabled={Boolean(server)}
                required
              />
            </FormField>

            <FormField label="工作目录" hint="实例运行目录，可填已有服务端目录。">
              <div className="flex gap-2">
                <input
                  className="form-input"
                  value={draft.workdir}
                  onChange={(event) => patch({ workdir: event.target.value })}
                  placeholder="D:\\Minecraft\\survival-1"
                  required
                />
                <button
                  type="button"
                  className="square-button h-10 w-10 shrink-0"
                  onClick={() => void selectDirectory()}
                  aria-label="选择工作目录"
                >
                  <FolderOpen size={17} />
                </button>
              </div>
            </FormField>

          </div>

          <div className="border-t border-slate-200 p-6">
            <FormField
              label="启动命令"
              hint={`适用于${typeLabel}，填写完整命令。支持带空格路径的引号，例如 "C:\\Program Files\\Java\\bin\\java.exe" -jar server.jar nogui。`}
            >
              <textarea
                className="form-input h-32 resize-y py-3 font-mono leading-6"
                value={draft.commandLine}
                onChange={(event) => patch({ commandLine: event.target.value })}
                placeholder={`"C:\\Program Files\\Java\\bin\\java.exe" -Xmx12G -jar server.jar nogui`}
                spellCheck={false}
                required
              />
            </FormField>
          </div>

          <div className="grid gap-x-6 gap-y-5 border-t border-slate-200 p-6 md:grid-cols-2 xl:grid-cols-4">
            <FormField label="关闭实例命令" hint="Minecraft 默认 stop，Velocity 默认 end。留空时只适合无 stdin 关闭命令的普通程序。">
              <input
                className="form-input"
                value={draft.stopCommand}
                onChange={(event) => patch({ stopCommand: event.target.value })}
                placeholder={draft.type === 'velocity' ? 'end' : draft.type === 'minecraft' ? 'stop' : '可选'}
              />
            </FormField>

            <FormField label="日志路径">
              <input
                className="form-input"
                value={draft.logFile}
                onChange={(event) => patch({ logFile: event.target.value })}
                placeholder="logs/latest.log"
              />
            </FormField>

            <FormField label="启动延迟秒">
              <input
                className="form-input"
                type="number"
                min={0}
                value={draft.startupDelaySeconds}
                onChange={(event) => patch({ startupDelaySeconds: Number(event.target.value) })}
              />
            </FormField>

            <FormField label="关闭超时秒">
              <input
                className="form-input"
                type="number"
                min={1}
                value={draft.shutdownTimeoutSeconds}
                onChange={(event) => patch({ shutdownTimeoutSeconds: Number(event.target.value) })}
              />
            </FormField>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <div className="flex flex-wrap gap-5 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  className="form-checkbox"
                  type="checkbox"
                  checked={draft.createDirectory}
                  onChange={(event) => patch({ createDirectory: event.target.checked })}
                />
                工作目录不存在时创建
              </label>
              <label className="flex items-center gap-2">
                <input
                  className="form-checkbox"
                  type="checkbox"
                  checked={draft.autoRestart}
                  onChange={(event) => patch({ autoRestart: event.target.checked })}
                />
                意外退出后自动重启
              </label>
            </div>

            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">
              <Save size={16} />
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function toInput(
  draft: ManagedInstanceDraft
): MinecraftServerCreateInput | VelocityServerCreateInput | CustomProcessCreateInput {
  const common = {
    id: draft.id,
    name: draft.name,
    workdir: draft.workdir,
    createDirectory: draft.createDirectory,
    autoRestart: draft.autoRestart,
    startupDelaySeconds: draft.startupDelaySeconds,
    shutdownTimeoutSeconds: draft.shutdownTimeoutSeconds,
    logFile: draft.logFile || undefined
  };

  if (draft.type === 'minecraft') {
    return {
      ...common,
      engine: draft.engine === 'velocity' ? 'paper' : draft.engine,
      commandLine: draft.commandLine,
      stopCommand: draft.stopCommand
    };
  }

  if (draft.type === 'velocity') {
    return {
      ...common,
      commandLine: draft.commandLine,
      stopCommand: draft.stopCommand
    };
  }

  return {
    ...common,
    command: draft.commandLine,
    argsText: '',
    stopCommand: draft.stopCommand
  };
}

function toPatch(draft: ManagedInstanceDraft): Partial<ServerInstanceConfig> {
  const commandParts = splitCommandLine(draft.commandLine);
  if (commandParts.length === 0) {
    throw new Error('启动命令不能为空');
  }
  const type = draft.type as ServerInstanceConfig['type'];
  return {
    name: draft.name,
    type,
    engine: draft.type === 'velocity' ? 'velocity' : draft.engine,
    workdir: draft.workdir,
    command: commandParts[0],
    args: commandParts.slice(1),
    stopCommand: draft.stopCommand,
    autoRestart: draft.autoRestart,
    startupDelaySeconds: draft.startupDelaySeconds,
    shutdownTimeoutSeconds: draft.shutdownTimeoutSeconds,
    group: undefined,
    logFile: draft.logFile || undefined,
    port: undefined,
    maxPlayers: undefined
  };
}

function splitCommandLine(value = ''): string[] {
  const result: string[] = [];
  const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|[^\s]+/g;
  for (const match of value.matchAll(pattern)) {
    result.push((match[1] ?? match[2] ?? match[0]).replace(/\\"/g, '"').replace(/\\'/g, "'"));
  }
  return result;
}

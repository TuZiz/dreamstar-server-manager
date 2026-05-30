import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { platform } from 'os';
import type { InstanceRuntimeState, ServerInstanceConfig } from '../../shared/types';
import { LogService } from '../logs/LogService';
import { toSafeErrorMessage } from '../utils/safeError';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function execFileAsync(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true }, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function shouldUseShell(command: string): boolean {
  return /\.(bat|cmd)$/i.test(command.trim());
}

export class ManagedProcess {
  private child?: ChildProcessWithoutNullStreams;
  private stoppingTimer?: NodeJS.Timeout;
  private restartTimer?: NodeJS.Timeout;
  private exitWaiters: Array<() => void> = [];

  private state: InstanceRuntimeState;

  constructor(
    private config: ServerInstanceConfig,
    private readonly logService: LogService,
    private readonly onStateChange: (state: InstanceRuntimeState) => void
  ) {
    this.state = {
      id: config.id,
      status: 'stopped',
      manualStop: false,
      lastExitCode: null,
      maxPlayers: config.maxPlayers
    };
  }

  updateConfig(config: ServerInstanceConfig): void {
    this.config = config;
    this.state.maxPlayers = config.maxPlayers;
    this.emitState();
  }

  getState(): InstanceRuntimeState {
    const uptimeSeconds =
      this.state.startedAt && this.state.status === 'running'
        ? Math.max(0, Math.floor((Date.now() - new Date(this.state.startedAt).getTime()) / 1000))
        : undefined;
    return { ...this.state, uptimeSeconds };
  }

  async start(): Promise<void> {
    if (this.child && !this.child.killed) {
      throw new Error('该实例已经在运行中');
    }
    if (!this.config.enabled) {
      throw new Error('该实例已禁用');
    }

    this.clearTimers();
    this.state = {
      ...this.state,
      status: 'starting',
      manualStop: false,
      lastError: undefined,
      maxPlayers: this.config.maxPlayers
    };
    this.emitState();

    const delay = Math.max(0, this.config.startupDelaySeconds ?? 0);
    if (delay > 0) {
      this.logService.append(this.config.id, 'system', `等待 ${delay} 秒后启动`);
      await sleep(delay * 1000);
    }

    try {
      this.child = spawn(this.config.command, this.config.args, {
        cwd: this.config.workdir,
        windowsHide: true,
        shell: shouldUseShell(this.config.command),
        env: process.env
      });
    } catch (error) {
      this.state.status = 'error';
      this.state.lastError = toSafeErrorMessage(error);
      this.emitState();
      throw error;
    }

    this.state = {
      ...this.state,
      status: 'running',
      pid: this.child.pid,
      startedAt: new Date().toISOString(),
      manualStop: false
    };
    this.logService.append(this.config.id, 'system', `启动命令: ${this.config.command} ${this.config.args.join(' ')}`);
    this.emitState();

    this.child.stdout.on('data', (chunk: Buffer) => {
      this.logService.append(this.config.id, 'stdout', chunk.toString('utf8'));
    });

    this.child.stderr.on('data', (chunk: Buffer) => {
      this.logService.append(this.config.id, 'stderr', chunk.toString('utf8'));
    });

    this.child.on('error', (error) => {
      this.state.status = 'error';
      this.state.lastError = toSafeErrorMessage(error);
      this.logService.append(this.config.id, 'stderr', `启动失败: ${this.state.lastError}`);
      this.emitState();
    });

    this.child.on('close', (code) => {
      this.clearStopTimer();
      const wasManualStop = this.state.manualStop;
      this.child = undefined;
      this.state = {
        ...this.state,
        status: wasManualStop || code === 0 ? 'stopped' : 'crashed',
        pid: undefined,
        startedAt: undefined,
        lastExitCode: code,
        manualStop: wasManualStop
      };
      this.logService.append(this.config.id, 'system', `进程已退出，退出码: ${code ?? 'null'}`);
      this.emitState();
      this.resolveExitWaiters();

      if (!wasManualStop && this.config.autoRestart) {
        this.scheduleAutoRestart();
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.child || this.child.killed) {
      this.state = { ...this.state, status: 'stopped', pid: undefined, manualStop: true };
      this.emitState();
      return;
    }

    this.state = { ...this.state, status: 'stopping', manualStop: true };
    this.emitState();

    const stopCommand = this.config.stopCommand?.trim();
    if (stopCommand) {
      this.writeCommand(stopCommand, false);
      this.logService.append(this.config.id, 'system', `已发送停止命令: ${stopCommand}`);
    } else {
      this.logService.append(this.config.id, 'system', '未配置停止命令，将请求结束进程');
      this.child.kill();
    }

    const timeout = Math.max(1, this.config.shutdownTimeoutSeconds ?? 20);
    this.stoppingTimer = setTimeout(() => {
      this.logService.append(this.config.id, 'system', `停止超时 ${timeout} 秒，执行强制终止`);
      void this.forceKill().catch((error) => {
        this.state.status = 'error';
        this.state.lastError = toSafeErrorMessage(error);
        this.emitState();
      });
    }, timeout * 1000);

    await this.waitForExit(timeout * 1000 + 8000);
  }

  async restart(): Promise<void> {
    this.state = { ...this.state, status: 'restarting', manualStop: true };
    this.emitState();
    if (this.child && !this.child.killed) {
      await this.stop();
    }
    await this.start();
  }

  async forceKill(): Promise<void> {
    if (!this.child || !this.state.pid) {
      this.state = { ...this.state, status: 'stopped', pid: undefined, manualStop: true };
      this.emitState();
      return;
    }

    this.state = { ...this.state, status: 'stopping', manualStop: true };
    this.emitState();

    if (platform() === 'win32') {
      await execFileAsync('taskkill', ['/PID', String(this.state.pid), '/T', '/F']);
    } else {
      this.child.kill('SIGKILL');
    }
    await this.waitForExit(8000);
  }

  sendCommand(command: string): void {
    const trimmed = command.trim();
    if (!trimmed) {
      throw new Error('命令不能为空');
    }
    if (!this.child || this.child.killed || this.state.status !== 'running') {
      throw new Error('实例未运行，无法发送命令');
    }
    this.writeCommand(trimmed, true);
  }

  private writeCommand(command: string, showInLog: boolean): void {
    if (!this.child?.stdin.writable) {
      throw new Error('进程 stdin 不可写');
    }
    this.child.stdin.write(`${command}\n`);
    if (showInLog) {
      this.logService.append(this.config.id, 'command', `> ${command}`);
    }
  }

  private scheduleAutoRestart(): void {
    this.logService.append(this.config.id, 'system', '检测到意外退出，准备自动重启');
    this.restartTimer = setTimeout(() => {
      void this.start().catch((error) => {
        this.state.status = 'error';
        this.state.lastError = toSafeErrorMessage(error);
        this.emitState();
      });
    }, 5000);
  }

  private waitForExit(timeoutMs: number): Promise<void> {
    if (!this.child) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, timeoutMs);
      this.exitWaiters.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  private resolveExitWaiters(): void {
    const waiters = [...this.exitWaiters];
    this.exitWaiters = [];
    waiters.forEach((resolve) => resolve());
  }

  private clearTimers(): void {
    this.clearStopTimer();
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = undefined;
    }
  }

  private clearStopTimer(): void {
    if (this.stoppingTimer) {
      clearTimeout(this.stoppingTimer);
      this.stoppingTimer = undefined;
    }
  }

  private emitState(): void {
    this.onStateChange(this.getState());
  }
}

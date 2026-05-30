import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { ConfigService } from './config/ConfigService';
import { DatabaseManager } from './database/DatabaseManager';
import { registerIpc } from './ipc';
import { LogService } from './logs/LogService';
import { ProcessManager } from './process/ProcessManager';
import { FileService } from './system/FileService';
import { PortService } from './system/PortService';
import { SystemDialogService } from './system/SystemDialogService';
import { SystemMetricsService } from './system/SystemMetricsService';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    show: false,
    title: 'DreamStar Server Manager',
    backgroundColor: '#f4f6f8',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

async function bootstrap(): Promise<void> {
  app.setName('DreamStar Server Manager');
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.dreamstar.server-manager');
  }

  await app.whenReady();

  const configService = new ConfigService(join(app.getPath('userData'), 'config.json'));
  await configService.load();

  const logService = new LogService();
  const processManager = new ProcessManager(configService, logService);
  const databaseManager = new DatabaseManager(configService);

  registerIpc({
    configService,
    processManager,
    databaseManager,
    logService,
    dialogService: new SystemDialogService(),
    fileService: new FileService(),
    portService: new PortService(),
    metricsService: new SystemMetricsService()
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

void bootstrap();

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

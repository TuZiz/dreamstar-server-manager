import { dialog } from 'electron';
import type { SelectFileOptions } from '../../shared/types';

export class SystemDialogService {
  async selectDirectory(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      title: '选择目录',
      properties: ['openDirectory', 'createDirectory']
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  }

  async selectFile(options: SelectFileOptions = {}): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      title: options.title ?? '选择文件',
      properties: ['openFile'],
      filters: options.filters
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  }

  async selectJavaExecutable(): Promise<string | null> {
    return this.selectFile({
      title: '选择 java.exe',
      filters: [
        { name: 'Java Executable', extensions: ['exe'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
  }
}

import { promises as fs } from 'fs';
import { basename, join } from 'path';

export class FileService {
  async checkPathExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async createDirectory(path: string): Promise<void> {
    await fs.mkdir(path, { recursive: true });
  }

  async copyFileToDirectory(source: string, targetDir: string, targetName?: string): Promise<string> {
    await fs.mkdir(targetDir, { recursive: true });
    const targetPath = join(targetDir, targetName?.trim() || basename(source));
    await fs.copyFile(source, targetPath);
    return targetPath;
  }
}

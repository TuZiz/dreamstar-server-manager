import { promises as fs } from 'fs';
import { basename, join, relative, resolve } from 'path';
import type { InstanceFileEntry, InstanceTextFile } from '../../shared/types';

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

  async listDirectory(root: string, relativePath = ''): Promise<InstanceFileEntry[]> {
    const directoryPath = this.resolveInside(root, relativePath);
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const result = await Promise.all(
      entries.map(async (entry) => {
        const absolutePath = join(directoryPath, entry.name);
        const stats = await fs.stat(absolutePath);
        const childRelativePath = this.toRelative(root, absolutePath);
        return {
          name: entry.name,
          relativePath: childRelativePath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modifiedAt: stats.mtime.toISOString()
        } satisfies InstanceFileEntry;
      })
    );

    return result.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name, 'zh-CN');
    });
  }

  async readTextFile(root: string, relativePath: string): Promise<InstanceTextFile> {
    const filePath = this.resolveInside(root, relativePath);
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new Error('只能读取文件');
    }
    const maxBytes = 1024 * 1024;
    const handle = await fs.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(Math.min(stats.size, maxBytes));
      await handle.read(buffer, 0, buffer.length, 0);
      return {
        relativePath: this.toRelative(root, filePath),
        content: buffer.toString('utf8'),
        size: stats.size,
        truncated: stats.size > maxBytes
      };
    } finally {
      await handle.close();
    }
  }

  async writeTextFile(root: string, relativePath: string, content: string): Promise<void> {
    const filePath = this.resolveInside(root, relativePath);
    await fs.writeFile(filePath, content, 'utf8');
  }

  private resolveInside(root: string, relativePath = ''): string {
    const rootPath = resolve(root);
    const targetPath = resolve(rootPath, relativePath || '.');
    const relation = relative(rootPath, targetPath);
    if (relation.startsWith('..') || relation === '..' || resolve(relation) === relation) {
      throw new Error('路径不能超出实例工作目录');
    }
    return targetPath;
  }

  private toRelative(root: string, absolutePath: string): string {
    return relative(resolve(root), resolve(absolutePath)).replace(/\\/g, '/');
  }
}

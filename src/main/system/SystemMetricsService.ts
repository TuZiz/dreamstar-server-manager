import os from 'os';
import type { SystemMetrics } from '../../shared/types';

export class SystemMetricsService {
  getSystemMetrics(): SystemMetrics {
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime()
    };
  }
}

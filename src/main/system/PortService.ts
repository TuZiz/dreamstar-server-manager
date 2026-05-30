import net from 'net';

export class PortService {
  checkPortAvailable(port: number, host = '127.0.0.1'): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close(() => resolve(true));
      });
      server.listen(port, host);
    });
  }
}

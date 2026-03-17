import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import * as http from 'http';
import { spawn, ChildProcess } from 'child_process';
import log from 'electron-log';

log.initialize();
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';
log.info('Application starting...');

const isDev = !app.isPackaged;
const API_PORT = 3001;
const WEB_PORT = 3000;

let mainWindow: BrowserWindow | null = null;
let apiProcess: ChildProcess | null = null;
let webServer: http.Server | null = null;

function getResourcePath(relativePath: string): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, relativePath);
  }
  return path.join(__dirname, '../../', relativePath);
}

function startApiServer(): Promise<void> {
  return new Promise((resolve) => {
    const apiPath = getResourcePath('api/server');
    
    log.info('Starting API server from:', apiPath);
    
    apiProcess = spawn(apiPath, [], {
      env: {
        ...process.env,
        PORT: API_PORT.toString(),
        NODE_ENV: 'production',
      },
      stdio: 'pipe',
    });

    apiProcess.stdout?.on('data', (data) => {
      log.info('[API]', data.toString().trim());
    });

    apiProcess.stderr?.on('data', (data) => {
      log.error('[API Error]', data.toString().trim());
    });

    apiProcess.on('spawn', () => {
      log.info('API server started on port', API_PORT);
      resolve();
    });

    apiProcess.on('error', (err) => {
      log.error('Failed to start API server:', err);
      resolve();
    });
  });
}

function startWebServer(): Promise<void> {
  return new Promise((resolve) => {
    const webPath = getResourcePath('web');
    log.info('Starting web server from:', webPath);

    webServer = http.createServer((req, res) => {
      const url = req.url || '/';
      let filePath = path.join(webPath, url === '/' ? 'index.html' : url);
      
      if (!path.extname(filePath)) {
        filePath = path.join(filePath, 'index.html');
      }

      const ext = path.extname(filePath);
      const contentTypes: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
      };
      const contentType = contentTypes[ext] || 'application/octet-stream';

      const fs = require('fs');
      
      if (req.url?.startsWith('/api/')) {
        const proxyReq = http.request({
          hostname: 'localhost',
          port: API_PORT,
          path: req.url,
          method: req.method,
          headers: req.headers,
        }, (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        });

        req.pipe(proxyReq, { end: true });
      } else {
        fs.readFile(filePath, (err: Error | null, data: Buffer) => {
          if (err) {
            res.writeHead(404);
            res.end('Not Found');
            return;
          }
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        });
      }
    });

    webServer.listen(WEB_PORT, () => {
      log.info('Web server started on port', WEB_PORT);
      resolve();
    });

    webServer.on('error', (err) => {
      log.error('Failed to start web server:', err);
      resolve();
    });
  });
}

function createWindow(): void {
  log.info('Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
    },
    titleBarStyle: 'default',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    log.info('Window ready to show');
  });

  if (isDev) {
    mainWindow.loadURL(`http://localhost:${WEB_PORT}`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`http://localhost:${WEB_PORT}`);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  log.info('App is ready');

  if (!isDev) {
    await startApiServer();
    await startWebServer();
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

function cleanup() {
  if (apiProcess) {
    apiProcess.kill();
    apiProcess = null;
  }
  if (webServer) {
    webServer.close();
    webServer = null;
  }
}

app.on('window-all-closed', () => {
  log.info('All windows closed');
  cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  cleanup();
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason);
});

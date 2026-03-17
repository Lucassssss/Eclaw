import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import log from 'electron-log';

log.initialize();
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';
log.info('Application starting...');

const isDev = !app.isPackaged;
const API_PORT = 3001;

let mainWindow: BrowserWindow | null = null;
let apiProcess: ChildProcess | null = null;
let apiRunning = false;

function getResourcePath(relativePath: string): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, relativePath);
  }
  return path.join(__dirname, '../../', relativePath);
}

function startApiServer(): Promise<void> {
  return new Promise((resolve) => {
    const apiPath = getResourcePath('api/server');
    const userDataPath = app.getPath('userData');
    
    log.info('Starting API server from:', apiPath);
    log.info('User data path:', userDataPath);
    
    apiProcess = spawn(apiPath, [], {
      env: {
        ...process.env,
        PORT: API_PORT.toString(),
        NODE_ENV: 'production',
        ECLAW_DATA_DIR: userDataPath,
      },
      stdio: 'pipe',
    });

    apiProcess.stdout?.on('data', (data) => {
      log.info('[API]', data.toString().trim());
    });

    apiProcess.stderr?.on('data', (data) => {
      const msg = data.toString().trim();
      log.warn('[API]', msg);
      
      if (msg.includes('Error:') || msg.includes('error:')) {
        log.warn('[API] API server encountered an error but continuing...');
      }
    });

    apiProcess.on('spawn', () => {
      log.info('API server started on port', API_PORT);
      apiRunning = true;
      resolve();
    });

    apiProcess.on('exit', (code) => {
      log.warn('API server exited with code:', code);
      apiRunning = false;
      
      if (!isDev && code !== 0) {
        log.info('Restarting API server in 3 seconds...');
        setTimeout(() => {
          if (!apiRunning) {
            startApiServer();
          }
        }, 3000);
      }
    });

    apiProcess.on('error', (err) => {
      log.error('Failed to start API server:', err.message);
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
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    const webPath = getResourcePath('web/index.html');
    log.info('Loading web from:', webPath);
    mainWindow.loadFile(webPath);
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
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason);
});

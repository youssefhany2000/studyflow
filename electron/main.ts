import { app, BrowserWindow } from 'electron';
import path from 'node:path';

import { getDb } from './db';
import { registerAllIpcHandlers } from './ipc';

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, 
    autoHideMenuBar: true, // Keeps the ugly File/Edit menu hidden
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.removeMenu(); 

  win.once('ready-to-show', () => {
    win.maximize(); // Opens fullscreen but leaves your Windows taskbar visible
    win.show();
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}
app.whenReady().then(() => {
  const db = getDb(); // opens studyflow.db and applies any pending migrations
  registerAllIpcHandlers(db);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
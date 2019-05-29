const electron = require('electron');
const path = require('path');
const url = require('url');

const appConfig = require('../../app.config');
const handleError = require('./electron-error.mjs');

let mainWindow;

process.on('uncaughtException', error => {
  handleError('Unhandled Error', error);
});

process.on('unhandledRejection', reason => {
  handleError('Unhandled Promise Rejection', reason);
});

const createWindow = () => {
  mainWindow = new electron.BrowserWindow({
    webPreferences: {
      nodeIntegration: true
    },
    width: appConfig.gui.width,
    height: appConfig.gui.height,
    // frame: false,
    icon: path.join(__dirname, '../../icon.png')
  });

  mainWindow.setMenu(null);

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'electron-app.html'),
    protocol: 'file:',
    slashes: true
  }));

  if (appConfig.dev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('close', (e) => {
    if (!reallyQuit()) {
      e.preventDefault();
    }
  });

  mainWindow.on('closed', function () {
    mainWindow = null
  });
};

const reallyQuit = () => {
  const buttonIndex = electron.dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Yes', 'No'],
    title: 'Confirm',
    message: 'Are you sure you want to quit?'
  });
  if (buttonIndex === 1) {
    return false;
  } else {
    return true;
  }
}

electron.app.on('ready', createWindow)

electron.app.on('window-all-closed', function () {
  // if (process.platform !== 'darwin') {
  electron.app.quit();
  // }
});

electron.app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});


const url = require('url');
const path = require('path');
const fs = require("fs");
const os = require('os');
const electron = require('electron');
const log = require('electron-log');

const packageJson = require('../../package.json');

module.exports = class GUI {

    logFilePath = path.resolve(
        (process.platform === 'darwin' ? '~/Library/Logs/' : os.homedir() + '/AppData/Roaming/')
        + electron.remote.app.getName() + '/log.log'
    );

    currentViewName = 'viewMain';

    constructor(options) {
        Object.keys(options).forEach(key => {
            this[key] = options[key];
        });

        this.win = electron.remote.BrowserWindow.getFocusedWindow();
    }

    init() {
        log.info('LOG AT ', this.logFilePath);
        this.window.document.title += ' v' + packageJson.version;
        this.createMenu();
        this.view(this.currentViewName);
    }

    view(viewName) {
        try {
            log.verbose('Hide:', this.currentViewName);
            if (this.currentViewName) {
                this.elements[this.currentViewName].style.display = 'none';
            }
            this.currentViewName = viewName;
            this.elements[this.currentViewName].style.display = 'block';
            this.elements[this.currentViewName].scrollTo(0, 0);
            log.verbose('Set view to:', this.currentViewName);
        } catch (e) {
            log.error('Cannot set view to ' + viewName + ' with elements', this.elements);
        }
    }

    modal(viewName) {
        let win = new electron.remote.BrowserWindow({
            parent: this.win,
            modal: true,
            show: false,
            backgroundColor: '#000000',
            width: this.appConfig.gui.modal.width,
            height: this.appConfig.gui.modal.height,
            // frame: false
        });

        win.setMenu(null);

        win.loadURL(
            url.format({
                protocol: 'file',
                slashes: true,
                pathname: path.join(__dirname, viewName + '.html')
            })
        );

        // if (this.appConfig.dev) {
        //     win.webContents.openDevTools();
        // }


        win.once('ready-to-show', () => win.show());
    }

    createMenu() {
        const menu = new electron.remote.Menu({ type: 'menubar' });

        const file = new electron.remote.Menu();
        // file.append(new electron.remote.MenuItem({ click: () => this.loadSkusDialog(), label: '&Open' }));
        // file.append(new electron.remote.MenuItem({ type: 'separator' }));
        file.append(new electron.remote.MenuItem({
            click: () => electron.remote.app.quit(),
            label: process.platform === 'darwin' ? '&Quit' : 'E&xit'
        }));

        menu.append(new electron.remote.MenuItem({
            label: '&File',
            submenu: file
        }));

        const settings = new electron.remote.Menu();
        settings.append(new electron.remote.MenuItem({ click: () => this.modal('settings'), label: '&Edit Settings' }));
        settings.append(new electron.remote.MenuItem({ type: 'separator' }));
        settings.append(new electron.remote.MenuItem({ click: () => this.resetSettingsAction(), label: 'Reset to defaults' }));
        menu.append(new electron.remote.MenuItem({
            label: '&Settings',
            submenu: settings
        }));

        const help = new electron.remote.Menu();
        help.append(new electron.remote.MenuItem({ click: () => this.view('help'), label: '&Help' }));

        help.append(new electron.remote.MenuItem({ click: () => electron.shell.openExternalSync('https://lee.goddards.space'), label: '&Support' }));
        help.append(new electron.remote.MenuItem({ type: 'separator' }));
        help.append(new electron.remote.MenuItem({ label: 'Show &Log', click: () => electron.shell.showItemInFolder(this.logFilePath) }));
        help.append(new electron.remote.MenuItem({ click: () => this.win.openDevTools(), label: '&Developer Tools' }));

        menu.append(new electron.remote.MenuItem({
            label: '&Help',
            submenu: help
        }));

        electron.remote.Menu.setApplicationMenu(menu);
    }
}


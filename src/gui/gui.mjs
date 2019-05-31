const url = require('url');
const path = require('path');
const fs = require("fs");
const os = require('os');
const electron = require('electron');
const log = require('./electron-log.mjs');

const packageJson = require('../../package.json');
const LsysParametric = require('../LsysParametric.mjs');
const Presets = require('./presets.mjs');

module.exports = class GUI {
    logFilePath = path.resolve(
        (process.platform === 'darwin' ? '~/Library/Logs/' : os.homedir() + '/AppData/Roaming/')
        + electron.remote.app.getName() + '/log.debug'
    );

    currentViewName = 'viewMain';
    settings = [];

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

        this.actions = Array.from(
            this.window.document.querySelectorAll('[id^=action]')
        ).reduce((collected, i) => {
            collected[i.id] = i;
            return collected;
        }, {});

        this.createListeners();
        this.loadPreset();
        this.view(this.currentViewName);
    }

    createListeners() {
        this.window.document.addEventListener('click', (e) => {
            if (this.actions[e.target.id]) {
                this[e.target.id]();
            }
        }, {
                passive: true
            }
        );

        Array.from(this.elements[this.currentViewName].querySelectorAll('form'))
            .forEach(
                form => {
                    form.addEventListener('change', e => {
                        log.info(e);
                        this.settingsChanged(e.target);
                    }, {
                            passive: true
                        }
                    );
                }
            );
    }

    settingsChanged(el) {
        if (el.nodeName === 'INPUT') {
            this.settings[el.id] = el.value.trim();
            log.silly('INPUT el %s changed to %s: ', el.id, this.settings[el.id], el);
        }

        else {
            const nodes = el.childNodes;
            let text = '';

            for (let i = 0; i < nodes.length; i++) {
                switch (nodes[i].nodeName) {
                    case '#text': text = text + nodes[i].nodeValue; break;
                    case 'BR': text = text + '\n'; break;
                }
            }

            this.settings[el.id] = text;
            log.silly('INNER TEXT el %s changed to %s: ', el.id, this.settings[el.id], text, el);
        }
    }

    view(viewName) {
        try {
            log.silly('Hide:', this.currentViewName);
            if (this.currentViewName) {
                this.elements[this.currentViewName].style.display = 'none';
            }
            this.currentViewName = viewName;
            this.elements[this.currentViewName].style.display = 'block';
            this.elements[this.currentViewName].scrollTo(0, 0);
            log.verbose('Set view to:', this.currentViewName);
        }
        catch (e) {
            log.info('Cannot set view to ' + viewName + ' with elements', this.elements);
            log.error(e);
        }
    }

    modal(viewName) {
        let win = new electron.remote.BrowserWindow({
            parent: this.win,
            modal: true,
            show: false,
            backgroundColor: '#000000',
            width: this.appConfig.gui.modal.width,
            height: this.appConfig.gui.modal.height
        });
        win.setMenu(null);
        win.loadURL(url.format({
            protocol: 'file',
            slashes: true,
            pathname: path.join(__dirname, viewName + '.html')
        }));
        win.once('ready-to-show', () => win.show());
    }

    createMenu() {
        const template = [
            {
                label: '&File',
                submenu: [
                    {
                        label: '&Load Preset',
                        submenu: Presets.map((preset, index) => {
                            return {
                                label: preset.title,
                                click: () => this.loadPreset(index)
                            }
                        })
                    },
                    { role: 'separator' },
                    { role: 'quit' }
                ]
            },

            {
                label: '&Settings',
                submenu: [
                    { role: 'toggledevtools' },
                    { label: 'Settings', click: () => this.view('settings') }
                ]
            },

            { role: 'viewMenu' },

            {
                label: '&Help',
                submenu: [
                    { role: 'toggledevtools' },
                    {
                        label: 'Show &Log',
                        click: () => electron.shell.showItemInFolder(this.logFilePath)
                    },
                    {
                        label: '&Support',
                        click: () => electron.shell.openExternalSync('https://lee.goddards.space')
                    }
                ]
            },
        ];

        const menu = electron.remote.Menu.buildFromTemplate(template)
        electron.remote.Menu.setApplicationMenu(menu);
    }

    actionGenerate() {
        log.debug('Enter actionGenerate');
        const oldActionGenerate = this.elements.actionGenerate.value;
        this.elements.actionGenerate.value = 'Generating...';
        this.elements.actionGenerate.disabled = true;
        this.elements.actionCreateMidi.disabled = true;

        const canvas = this.window.document.createElement('canvas');
        this.elements.canvases.insertBefore(canvas, this.elements.canvases.firstChild);

        log.info('Call Lsys with', this.settings);

        const lsys = new LsysParametric({
            ... this.settings,
            canvas,
            logger: log,
        }, canvas);
        lsys.generate(
            this.settings.totalGenerations
        );

        // if (this.elTimeDisplay) {
        //     this.elTimeDisplay.innerText = 'Generated in ' + (new Date().getTime() - (elTimeDisplay.get('text'))) + ' ms';
        // }

        canvas.scrollIntoView({
            behavior: "smooth",
            block: "end"
        });

        this.window.document.getElementById('contentDisplay').value = lsys.content;
        this.elements.actionGenerate.value = oldActionGenerate;
        this.elements.actionGenerate.disabled = false;
        this.elements.actionCreateMidi.disabled = false;
    }

    actionGenerateMidi() {
        const oldValue = this.createMidi.value;
        this.createMidi.value = 'Hang on...';
        this.createMidi.disabled = true;
        fetch('/cgi-bin/fractal_plant_chords.cgi', {
            duration: this.window.document.getElementById('duration').value,
            angle: this.window.document.getElementById('angle').value,
            scale: this.window.document.getElementById('scale').value
        }).then(() => {
            this.playSound("/cgi-output/cgi.midi");
            this.createMidi.value = oldValue;
            this.createMidi.disabled = false;
        }).catch(() => {
            log.error(e);
            alert('Failure :(');
        });
    }

    loadPreset(idx = 0) {
        log.debug('Load preset ', idx, Presets[idx]);

        if (!Presets[idx].totalGenerations) {
            Presets[idx].totalGenerations = 1;
        }

        Object.keys(Presets[idx]).forEach(id => {
            try {
                log.verbose('Preset set "%s" to "%s"', id, Presets[idx][id]);
                const el = this.window.document.getElementById(id);
                if (el.nodeName === 'INPUT') {
                    el.value = Presets[idx][id];
                }
                else {
                    el.innerText = Presets[idx][id];
                }
                this.settingsChanged(el);
            }
            catch (e) {
                log.error('Could not set ' + id + '.value: missing GUI element?\n', e);
            }
        });

        this.window.document.getElementById('title').innerText = Presets[idx].title;
    }
}

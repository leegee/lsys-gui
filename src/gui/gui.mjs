const url = require('url');
const path = require('path');
const fs = require("fs");
const os = require('os');
const { fork } = require('child_process');
const electron = require('electron');

const LsysParametric = require('../LsysParametric.mjs');
const LsysRenderer = require('./LsysRenderer.mjs');
const MIDI = require('../MIDI.mjs');
const log = require('./electron-log.mjs');
const Presets = require('./Presets.mjs');
const packageJson = require('../../package.json');

module.exports = class GUI {
    logFilePath = log.findLogPath();
    midiFilePath = path.resolve('output.mid');
    midi = null;
    canvas = null;
    lsysRenderer = null;
    currentViewName = 'viewMain';
    _lastGenerationContent = '';
    settings = {
        // mergeDuplicates: 1,
        duration: 5,
        scale: 'pentatonic',
        initialNote: 50,
        canvasWidth: 1000,
        canvasHeight: 800,
        angle: 30,
        xoffset: 0,
        yoffset: 0,
        turtleStepX: 10,
        turtleStepY: 10,
        lineWidth: 10,
        initX: null,
        initY: null,
        backInTime: true,
        canvasBackgroundColour: '#eeeeee',
        opacities: [
            0.8, 0.6, 0.5, 0.4
        ],
        colours: [
            "#825a46",
            "#21b418",
            "#32d232",
            "#46ff46"
        ]
    };

    constructor(options) {
        log.verbose('Enter new GUI');
        Object.keys(options).forEach(key => {
            this[key] = options[key];
        });

        const { width, height } = electron.remote.screen.getPrimaryDisplay().workAreaSize;
        this.settings.canvasWidth = width;
        this.settings.canvasHeight = height;

        this.win = electron.remote.BrowserWindow.getFocusedWindow();
        this.midi = new MIDI(this.midiFilePath);
    }

    init() {
        this.midi.activate({
            log,
            navigator: this.navigator,
            window: this.window
        }).then(() => {
            this.midi.outputs.forEach((output, index) => {
                const el = this.window.document.createElement('li');
                el.innerHTML = '<label><input type="checkbox" checked class="midiPort" data-index="' + index + '">' + output.name + '</label>';
                this.elements.midiPorts.appendChild(el);
                el.addEventListener('click', e => this.midi.togglePort(e.target.dataset.index, e.target.checked));
            });
        });

        this.window.document.title += ' v' + packageJson.version;
        this.createMenu();

        this.actions = Array.from(
            this.window.document.querySelectorAll('[id^=action]')
        ).reduce((collected, i) => {
            collected[i.id] = i;
            return collected;
        }, {});

        // Settings arrays :(
        this.settings.colours.forEach((value, index) => {
            let el = this.window.document.getElementById('colours-' + index);
            el.setAttribute('value', value);
            el.value = value;
            el = this.window.document.getElementById('opacities-' + index);
            el.setAttribute('value', this.settings.opacities[index]);
            el.value = this.settings.opacities[index];
        });

        this.updateSettings();
        this.createListeners();
        this.loadPreset();
        this.view(this.currentViewName);
    }

    createListeners() {
        this.window.document.addEventListener('click', e => {
            if (e.target.id && this.actions[e.target.id]) {
                this[e.target.id]();
                return false;
            }
        }, {
                passive: true
            }
        );

        this.window.document.addEventListener('change', e => {
            this.settingsChanged(e.target);
        }, {
                passive: true
            }
        );
    }

    settingsChanged(el) {
        log.debug('settingChanged', el.nodeName);
        if (el.nodeName === 'INPUT') {
            const matchGroup = el.id.match(/^(\w+)-(\d+)$/);
            if (matchGroup) {
                this.settings[matchGroup[1]][matchGroup[2]] = el.value.trim();
                log.debug('INTPUT el %o changed %s[%d] to %s', matchGroup[1], matchGroup[2], this.settings[matchGroup[1]][matchGroup[2]]);
            } else {
                this.settings[el.id] = el.value.trim();
                log.silly('INPUT el %o changed to %s: ', el.id, this.settings[el.id], el);
            }
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
        log.debug('Switch view %s to %s', this.currentViewName, viewName)
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
                    { label: 'P&references', click: () => this.view('viewSettings') },
                    { role: 'separator' },
                    { role: 'quit' }
                ]
            },

            {
                label: 'Ac&tions',
                submenu: [
                    { label: '&Clear Canvases', click: () => this.actionClear() },
                    {
                        label: 'Show &MIDI File',
                        click: () => electron.shell.showItemInFolder(this.midiFilePath)
                    },
                ]
            },

            // { role: 'viewMenu' },

            {
                label: '&Help',
                submenu: [
                    {
                        label: 'Show &Log',
                        click: () => electron.shell.showItemInFolder(this.logFilePath)
                    },
                    {
                        label: '&Developer Tools',
                        click: () => this.win.openDevTools(),
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

    service(cmd, args) {
        this._service = fork(
            path.join(__dirname, 'service'),
            [],
            { stdio: ['inherit', 'inherit', 'inherit', 'ipc'] }
        );

        this._service.on('close', () => log.verbose('child close'));
        this._service.on('exit', () => log.verbose('child exit'));
        this._service.on('error', (err) => {
            log.verbose('child error', err);
            throw err;
        });

        this._service.on('message', msg => {
            switch (msg.cmd) {
                case 'error':
                    log.error(msg);
                    throw new Error((msg.title || 'NO TITLE' + ' ' + msg.name || 'NO_ERROR_NAME') + ' ' + (msg.message || 'NO_ERROR_MESSAGE'));
                case 'call':
                    try {
                        log.log('Try to call', msg.methodName);
                        this[msg.methodName](msg);
                    } catch (e) {
                        if (e.name === 'TypeError') {
                            log.error('MethodName: ', msg.methodName);
                            throw e;
                        }
                    }
                    break;
                default:
                    log.error('Unknown command: ', msg);
            }
        });

        this._service.send({ cmd, ...args });
    }

    updateSettings() {
        Object.keys(this.settings).forEach(id => {
            try {
                log.verbose('Preset set "%s" to "%s"', id, this.settings[id]);
                const el = this.window.document.getElementById(id);
                if (el) {
                    if (el.nodeName) {
                        if (el.nodeName === 'INPUT') {
                            const type = el.getAttribute('type');
                            if (type === 'checkbox') {
                                el.value = 1;
                                el.checked = this.settings[id];
                                el.setAttribute('checked', this.settings[id]);
                            } else {
                                el.value = this.settings[id];
                            }
                        }
                        else {
                            el.innerText = this.settings[id];
                        }
                    }
                    this.settingsChanged(el);
                }
            }
            catch (e) {
                log.error('Could not set ' + id + '.value: missing GUI element?\n', e);
            }
        });
    }

    loadPreset(idx = 0) {
        log.info('Load preset ', idx, Presets[idx]);

        if (!Presets[idx].totalGenerations) {
            Presets[idx].totalGenerations = 1;
        }

        Object.keys(Presets[idx]).forEach(id => {
            this.settings[id] = Presets[idx][id]
        });

        this.updateSettings();
        this.actionGenerate(1);
    }

    actionViewMain() {
        this.view('viewMain');
    }

    actionClear() {
        this.elements.canvases.innerText = '';
    }

    actionGenerate(totalGenerations) {
        log.verbose('Enter actionGenerate');
        this._oldActionGenerate = this.elements.actionGenerate.value;
        this.window.document.body.style.cursor = 'progress';
        this.elements.actionGenerate.value = 'Generating...';
        this.elements.actionGenerate.disabled = true;
        this.elements.actionCreateMidi.disabled = true;

        this.canvas = this.window.document.createElement('canvas');

        this.lsysRenderer = new LsysRenderer(this.settings, this.canvas);

        this.elements.canvases.insertBefore(this.canvas, this.elements.canvases.firstChild);
        this.canvas.scrollIntoView({
            behavior: "smooth",
            block: "end"
        });

        const settings = {
            start: this.settings.start,
            variables: this.settings.variables,
            rules: this.settings.rules,
            totalGenerations: totalGenerations || this.settings.totalGenerations
        }
        log.silly('Call service to start Lsys with', settings);
        this.service('start', settings);
    }

    actionCreateMidi() {
        log.info('Enter actionCreateMidi');
        const oldButtonText = this.elements.actionCreateMidi.value;
        this.elements.actionCreateMidi.value = 'Hang on...';
        this.elements.actionCreateMidi.disabled = true;

        this.midi.play(
            this.lsysRenderer.notesContent,
            this.settings.scale,
            this.settings.duration
        ); // this.settings.midiPort, 

        this.elements.actionCreateMidi.value = oldButtonText;
        this.elements.actionCreateMidi.disabled = false;

    }

    openElementInNewWindow(canvas) {
        log.silly('Enter openElementInNewWindow');
        let win = new electron.remote.BrowserWindow({
            parent: this.win,
            // modal: true,
            show: false,
            backgroundColor: '#000000',
            width: this.appConfig.gui.openInNewWindow.width,
            height: this.appConfig.gui.openInNewWindow.height
        });
        win.loadURL(canvas.toDataURL());
        win.setMenu(null);
        win.maximize();
        win.once('ready-to-show', () => {
            win.show();
            log.silly('openElementInNewWindow is done');
        });
    }

    serviceDoneGeneration(content) {
        log.info('###########################################\n', content);
        const currentGeneration = currentGeneration.substring(
            this._lastGenerationContent.length
        );
        this.lsysRenderer.resize(currentGeneration);
        this.lsysRenderer.render(currentGeneration);
        this._lastGenerationContent = currentGeneration;
        this.window.alert('continue');
    }

    lsysDone({ content }) {
        log.info('Enter lsysDone with %d byes of content', content.length);
        this.window.document.getElementById('contentDisplay').value = content;
        this.window.document.body.style.cursor = 'default';
        this.elements.actionGenerate.value = this._oldActionGenerate;
        this.elements.actionGenerate.disabled = false;
        this.elements.actionCreateMidi.disabled = false;

        log.info('Call lsysRender');
        this.lsysRenderer.render(content);
        log.info('Call resize');
        this.lsysRenderer.resize(content);
        log.info('Call lsysRender again');
        this.lsysRenderer.lsysFinalise();
        log.info('Attach click handler');
        this.canvas.addEventListener('click', (e) => this.openElementInNewWindow(e.target));
        log.info('FINISHED lsysDone');
    }

}

const url = require('url');
const path = require('path');
const fs = require("fs");
const os = require('os');
const { fork } = require('child_process');
const electron = require('electron');

const LsysParametric = require('../LsysParametric.mjs');
const log = require('./electron-log.mjs');
const Presets = require('./presets.mjs');
const packageJson = require('../../package.json');

module.exports = class GUI {
    logFilePath = log.findLogPath();

    currentViewName = 'viewMain';
    _lastGenerationContent = '';
    settings = {
        // mergeDuplicates: 1,
        duration: 48,
        scale: 'pentatonic',
        canvasWidth: 600,
        canvasHeight: 400,
        angle: 30,
        xoffset: 0,
        yoffset: 0,
        turtleStepX: 10,
        turtleStepY: 10,
        lineWidth: 10,
        initX: null,
        initY: null,
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

        const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
        this.settings.canvasWidth = width;
        this.settings.canvasHeight = height;

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
            if (this.actions[e.target.id]) {
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
                    { role: 'separator' },
                    { role: 'quit' }
                ]
            },

            {
                label: '&View',
                submenu: [
                    { label: 'P&references', click: () => this.view('viewSettings') },
                    { label: '&Clear', click: () => this.view('actionClear') },
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
                            el.value = this.settings[id];
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
        this.ctx = this.canvas.getContext("2d");
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2); // Translate context to center of canvas:

        this.setCanvas();

        this.elements.canvases.insertBefore(this.canvas, this.elements.canvases.firstChild);
        this.canvas.scrollIntoView({
            behavior: "smooth",
            block: "end"
        });

        this.x = this.maxX = this.minX = Number(this.settings.initX);
        this.y = this.maxY = this.minY = Number(this.settings.initY);

        this.preparedColours = [];
        for (let i = 0; i < this.settings.colours.length; i++) {
            this.preparedColours[i] = this.hexAndOpacityToRgba(this.settings.colours[i], this.settings.opacities[i])
        }
        this.lsysSetColour(0);

        const settings = {
            start: this.settings.start,
            variables: this.settings.variables,
            rules: this.settings.rules,
            totalGenerations: totalGenerations || this.settings.totalGenerations
        }
        log.silly('Call Lsys with', settings);
        this.service('start', settings);
    }

    actionGenerateMidi() {
        // const oldValue = this.createMidi.value;
        // this.createMidi.value = 'Hang on...';
        // this.createMidi.disabled = true;
        // fetch('/cgi-bin/fractal_plant_chords.cgi', {
        //     duration: this.settings.duration,
        //     angle: this.settings.angle,
        //     scale: this.settings.scale
        // }).then(() => {
        //     this.playSound("/cgi-output/cgi.midi");
        //     this.createMidi.value = oldValue;
        //     this.createMidi.disabled = false;
        // }).catch(e => {
        //     log.error(e);
        //     alert('Failure :(');
        // });
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

    lsysResize(content) {
        log.verbose('Resize Min: %d , %d\nMax: %d , %d', this.minX, this.minY, this.maxX, this.maxY);
        const wi = (this.minX < 0) ?
            Math.abs(this.minX) + Math.abs(this.maxX) : this.maxX - this.minX;
        const hi = (this.minY < 0) ?
            Math.abs(this.minY) + Math.abs(this.maxY) : this.maxY - this.minY;
        if (this.maxY <= 0) {
            throw new RangeError('maxY out of bounds');
        }
        if (this.maxX <= 0) {
            throw new RangeError('maxX out of bounds');
        }

        const sx = this.canvas.width / wi;
        const sy = this.canvas.height / hi;

        if (sx !== 0 && sy !== 0) {
            this.setCanvas();

            this.ctx.scale(sx, sy);

            this.x = Number(this.settings.initX) || 0; // this.settings.turtleStepX|| 0;
            this.y = Number(this.settings.initY) || this.canvas.height / 2;
            this.y -= this.minY;

            this.lsysRender(content);
            log.verbose('Resized via scale %d, %d', sx, sy);
        }

        log.verbose('Leave resize');
    };

    lsysRender(content) {
        let dir = 0;
        const states = [];

        this.stepped = 0;

        // PRODUCTION RULES:
        for (let i = 0; i < content.length; i++) {
            let draw = true;
            this.penUp = false;
            const atom = content.charAt(i).toLowerCase();

            log.silly('Do content atom %d, (%s)', i, atom);

            switch (atom) {
                case 'f': // Forwards
                    break;
                case 'c': // Set colour
                    const colourCode = content.charAt(++i);
                    const index = parseInt(colourCode, 10) % this.settings.colours.length;
                    log.silly('Got colour code (%s) made index', colourCode, index);
                    this.lsysSetColour(index);
                    draw = false;
                    break;
                case '+': // Right
                    dir += this.settings.angle;
                    break;
                case '-': // Left
                    dir -= this.settings.angle;
                    break;
                case '[': // Start a branch
                    states.push([dir, this.x, this.y, this.colour, this.stepped]);
                    draw = false;
                    break;
                // End a branch
                case ']':
                    const state = states.pop();
                    dir = state[0];
                    this.x = state[1];
                    this.y = state[2];
                    this.colour = state[3];
                    this.stepped = state[4];
                    draw = true;
                    break;
            };

            if (draw) {
                this.lsysTurtleGraph(dir);
                this.stepped++;
            }
        }
    }

    lsysTurtleGraph(dir) {
        log.silly('Move dir (%s) from x (%s) y (%s)', dir, this.x, this.y);

        this.ctx.beginPath();
        if (this.settings.generationsScaleLines > 0) {
            this.ctx.lineWidth = this.settings.lineWidth;
        }
        else if (this.settings.lineWidth) {
            this.ctx.lineWidth = this.settings.lineWidth;
        }

        this.ctx.moveTo(this.x, this.y);
        this.x += (LsysParametric.dcos(dir) * this.settings.turtleStepX);
        this.y += (LsysParametric.dsin(dir) * this.settings.turtleStepY);

        this.x += this.settings.xoffset;
        this.y += this.settings.yoffset;

        this.ctx.lineTo(this.x, this.y);
        this.ctx.closePath();

        if (!this.penUp) {
            log.debug('DRAW in colour ', this.ctx.strokeStyle);
            this.ctx.stroke();
        }
        if (this.x > this.maxX) this.maxX = this.x;
        if (this.y > this.maxY) this.maxY = this.y;
        if (this.x < this.minX) this.minX = this.x;
        if (this.y < this.minY) this.minY = this.y;

        log.silly('Moved to x (%s) y (%s)', this.x, this.y);
    };

    setWidth(px) {
        this.ctx.lineWidth = px;
    };

    lsysFinalise() {
        log.verbose('Enter lsysFinalise');
        if (this.settings.finally && typeof this.settings.finally === 'function') {
            log.verbose('Call finally');
            this.settings.finally.call(this);
        }
        log.verbose('Leave lsysFinalise');
    };

    // Thanks https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
    hexAndOpacityToRgba(hex, opacity) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 'rgb(' +
            parseInt(result[1], 16) + ',' +
            parseInt(result[2], 16) + ',' +
            parseInt(result[3], 16) + ',' +
            opacity +
            ')' : null;
    }

    lsysSetColour(colourIndex) {
        this.colour = this.preparedColours[colourIndex];
        log.silly('Set colour to index (%d): ', colourIndex, this.colour, this.settings.colours);
        this.ctx.strokeStyle = this.colour;
    }

    setCanvas() {
        this.canvas.width = this.settings.canvasWidth;
        this.canvas.height = this.settings.canvasHeight;
        this.ctx.fillStyle = this.settings.canvasBackgroundColour;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    lsysDone({ content }) {
        log.verbose('Enter lsysDone with %d byes of content', content.length);
        this.window.document.getElementById('contentDisplay').value = content;
        this.window.document.body.style.cursor = 'default';
        this.elements.actionGenerate.value = this._oldActionGenerate;
        this.elements.actionGenerate.disabled = false;
        this.elements.actionCreateMidi.disabled = false;

        this.lsysRender(content);
        this.lsysResize(content);

        this.lsysFinalise();
        this.canvas.addEventListener('click', (e) => this.openElementInNewWindow(e.target));
    }

    doneGeneration(content) {
        log.info('###########################################\n', content);
        const currentGeneration = currentGeneration.substring(
            this._lastGenerationContent.length
        );
        this.lsysResize(currentGeneration);
        this.lsysRender(currentGeneration);
        this._lastGenerationContent = currentGeneration;
        this.window.alert('continue');
    }
}

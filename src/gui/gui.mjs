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
    logFilePath = path.resolve(
        (process.platform === 'darwin' ? '~/Library/Logs/' : os.homedir() + '/AppData/Roaming/')
        + electron.remote.app.getName() + '/log.debug'
    );

    currentViewName = 'viewMain';
    settings = {
        // mergeDuplicates: 1,
        duration: 48,
        scale: 'pentatonic',
        initialNoteDecimal: 58,
        canvasWidth: 2000,
        canvasHeight: 800,
        angle: 30,
        xoffset: 0,
        yoffset: 0,
        turtleStepX: 10,
        turtleStepY: 10,
        lineWidth: 10,
        initX: null,
        initY: null,
        canvasBackgroundColour: '#eeeeee',
        colours: [
            "rgba(130,  90, 70, 0.8)",
            "rgba(33, 180, 24, 0.6)",
            "rgba(50, 210, 50, 0.5)",
            "rgba(70, 255, 70, 0.4)"
        ]
    };

    constructor(options) {
        log.debug('Enter new GUI');
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

        this.actionGenerate();
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

                    { label: '&Preferences', click: () => this.view('viewSettings') },
                    { role: 'separator' },
                    { role: 'quit' }
                ]
            },

            { role: 'viewMenu' },

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
                    this[msg.methodName](msg);
                    break;
                default:
                    log.error('Unknown command: ', msg);
            }
        });

        this._service.send({ cmd, ...args });
    }

    actionViewMain() {
        this.view('viewMain');
    }

    actionGenerate() {
        log.debug('Enter actionGenerate');
        this._oldActionGenerate = this.elements.actionGenerate.value;
        this.elements.actionGenerate.value = 'Generating...';
        this.elements.actionGenerate.disabled = true;
        this.elements.actionCreateMidi.disabled = true;

        this.canvas = this.window.document.createElement('canvas');
        this.ctx = this.canvas.getContext("2d");
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2); // Translate context to center of canvas:

        this.setCanvas();

        this.elements.canvases.insertBefore(this.canvas, this.elements.canvases.firstChild);

        this.x = this.maxX = this.minX = Number(this.settings.initX);
        this.y = this.maxY = this.minY = Number(this.settings.initY);

        this.lsysSetColour(0);

        log.silly('Call Lsys with', this.settings);
        this.service('start', this.settings);
    }

    lsysDone({ content }) {
        log.debug('Enter lsysDone with %d byes of content', content.length);
        // if (this.elTimeDisplay) {
        //     this.elTimeDisplay.innerText = 'Generated in ' + (new Date().getTime() - (elTimeDisplay.get('text'))) + ' ms';
        // }

        this.canvas.scrollIntoView({
            behavior: "smooth",
            block: "end"
        });

        this.window.document.getElementById('contentDisplay').value = content;
        this.elements.actionGenerate.value = this._oldActionGenerate;
        this.elements.actionGenerate.disabled = false;
        this.elements.actionCreateMidi.disabled = false;

        this.lsysRender(content);
        this.lsysResize(content);

        this.lsysFinalise();
    }

    actionGenerateMidi() {
        const oldValue = this.createMidi.value;
        this.createMidi.value = 'Hang on...';
        this.createMidi.disabled = true;
        fetch('/cgi-bin/fractal_plant_chords.cgi', {
            duration: this.settings.duration,
            angle: this.settings.angle,
            scale: this.settings.scale
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
        log.info('Load preset ', idx, Presets[idx]);

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
                    log.silly('Got colour code (%s)', colourCode);
                    this.lsysSetColour(
                        parseInt(colourCode, 10) % this.settings.colours
                    );
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
        log.debug('Move dir (%s) from x (%s) y (%s)', dir, this.x, this.y);

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

        log.debug('Moved to x (%s) y (%s)', this.x, this.y);
    };

    setWidth(px) {
        this.ctx.lineWidth = px;
    };

    lsysFinalise() {
        log.verbose('Enter lsysFinalise');
        if (this.settings.finally && typeof this.settings.finally === 'function') {
            log.debug('Call finally');
            this.settings.finally.call(this);
        }
        log.verbose('Leave lsysFinalise');
    };

    lsysSetColour(colourIndex) {
        this.colour = this.settings.colours[colourIndex];
        log.debug('Set colour to index (%d): ', colourIndex, this.colour);
        this.ctx.strokeStyle = this.colour;
    }

    setCanvas() {
        this.canvas.width = this.settings.canvasWidth;
        this.canvas.height = this.settings.canvasHeight;
        this.ctx.fillStyle = this.settings.canvasBackgroundColour;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

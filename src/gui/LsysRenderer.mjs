const DEGREE_TO_RADIAN_FACTOR = Math.PI / 180.0;

const LsysRenderer = class LsysRenderer {
    preparedColours = [];
    settings = null;
    canvas = null;
    ctx = null;
    x = null;
    y = null;
    preparedColours = [];
    notesContent = {
        on: {},
        off: {}
    };
    stepped = null;

    static dsin(degrees) {
        return Math.sin(degrees * DEGREE_TO_RADIAN_FACTOR)
    };

    static dcos(degrees) {
        return Math.cos(degrees * DEGREE_TO_RADIAN_FACTOR)
    };

    constructor(settings, canvas, logger) {
        this.settings = settings;
        this.canvas = canvas;
        this.logger = logger;
        this.ctx = this.canvas.getContext("2d");
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2); // Translate context to center of canvas:

        this.settings.initX = 0;
        this.settings.initY = 0;

        this.x = this.maxX = this.minX = Number(this.settings.initX);
        this.y = this.maxY = this.minY = Number(this.settings.initY);

        for (let i = 0; i < this.settings.colours.length; i++) {
            this.preparedColours[i] = this._hexAndOpacityToRgba(this.settings.colours[i], this.settings.opacities[i])
        }

        this._setColour(0);
        this._setUpCanvas();
    }

    _setUpCanvas() {
        this.canvas.width = this.settings.canvasWidth;
        this.canvas.height = this.settings.canvasHeight;
        this.ctx.fillStyle = this.settings.canvasBackgroundColour;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.x = Number(this.settings.initX);
        this.y = Number(this.settings.initY);
    }

    render(content, midiRenderer) {
        this._render({ content, draw: false });
        this._afterRender(content, midiRenderer);
    }

    finalise() {
        this.logger.verbose('Enter finalise');
        if (this.settings.finally && typeof this.settings.finally === 'function') {
            this.logger.verbose('Call finally');
            this.settings.finally.call(this);
        }
        this.logger.verbose('Leave finalise');
    };

    _render({ content, draw, midiRenderer }) {
        this.logger.info('RENDER: draw:%s, midiRenderer:%s', draw, midiRenderer ? true : false);
        if (midiRenderer) {
            this.logger.info('x'.repeat(40));
            this.logger.info(content);
            this.logger.info('x'.repeat(40));
        }
        this.penUp = !draw;
        this.punUp = false;
        let dir = 0;
        const states = [];
        this.noteTick = 0;
        this.notesContent = {
            on: {},
            off: {}
        };
        this.stepped = 0;

        // PRODUCTION RULES:
        for (let i = 0; i < content.length; i++) {
            let draw = true;
            this.penUp = false;
            const atom = content.charAt(i).toLowerCase();

            this.logger.silly('Do content atom %d, (%s)', i, atom);

            switch (atom) {
                case 'f': // Forwards
                    break;
                case 'c': // Set colour
                    const colourCode = content.charAt(++i);
                    const index = parseInt(colourCode, 10) % this.settings.colours.length;
                    this.logger.silly('Got colour code (%s) made index', colourCode, index);
                    this._setColour(index);
                    draw = false;
                    break;
                case '+': // Right
                    dir += Number(this.settings.angle);
                    break;
                case '-': // Left
                    dir -= Number(this.settings.angle);
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
                this.logger.debug('SET DIR', dir);
                this._turtleGraph(dir);
                this._addNotes(dir, midiRenderer);
                this.stepped++;
            }
        }
    }

    _addNotes(dir, midiRenderer) {
        // always forwards
        const startTick = this.x; // this.stepped
        const pitchIndex = this.y;
        const duration = 1;

        if (!this.penUp) {
            this.notesContent.on[startTick] = this.notesContent.on[startTick] || [];
            this.notesContent.off[startTick] = this.notesContent.off[startTick] || [];

            this.notesContent.on[startTick].push(pitchIndex);
            this.notesContent.off[startTick].push(duration);

            if (midiRenderer) {
                // Need a way to render a whole generation to preserve the polyphony created by branches?
                midiRenderer.playNote({
                    startTick, pitchIndex, duration
                });
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _turtleGraph(dir) {
        this.logger.debug('Move dir (%s) from x (%s) y (%s)', dir, this.x, this.y);

        this.ctx.beginPath();
        // if (this.settings.generationsScaleLines > 0) {
        // this.ctx.lineWidth = this.settings.lineWidth; // * (totalGenerations - currentGenerationNumber);
        // }
        // else if (this.settings.lineWidth) {
        this.ctx.lineWidth = this.settings.lineWidth;
        // }
        this.ctx.moveTo(this.x, this.y);

        this.x += (LsysRenderer.dcos(dir) * this.settings.turtleStepX);
        this.y += (LsysRenderer.dsin(dir) * this.settings.turtleStepY);

        // this.x += this.settings.xoffset;
        // this.y += this.settings.yoffset;

        if (!this.penUp) {
            this.logger.debug('DRAW LINE TO ', Math.round(this.x), Math.round(this.y));
            this.ctx.lineTo(Math.round(this.x), Math.round(this.y));
            this.ctx.closePath();
            this.ctx.stroke();
        }

        if (this.x < this.minX) this.minX = this.x;
        if (this.x > this.maxX) this.maxX = this.x;
        if (this.y < this.minY) this.minY = this.y;
        if (this.y > this.maxY) this.maxY = this.y;

        this.logger.silly('Moved to x (%s) y (%s)', this.x, this.y);
    };

    _setWidth(px) {
        this.ctx.lineWidth = px;
    };

    // Thanks https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
    _hexAndOpacityToRgba(hex, opacity) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 'rgb(' +
            parseInt(result[1], 16) + ',' +
            parseInt(result[2], 16) + ',' +
            parseInt(result[3], 16) + ',' +
            opacity +
            ')' : null;
    }

    _setColour(colourIndex) {
        this.colour = this.preparedColours[colourIndex];
        this.logger.silly('Set colour to index (%d): ', colourIndex, this.colour, this.settings.colours);
        this.ctx.strokeStyle = this.colour;
    }


    resizeCanvas() {
        this.logger.debug('Resize Min: %d , %d\nMax: %d , %d', this.minX, this.minY, this.maxX, this.maxY);
        const wi = (this.minX < 0) ?
            Math.abs(this.minX) + Math.abs(this.maxX) : this.maxX - this.minX;
        const hi = (this.minY < 0) ?
            Math.abs(this.minY) + Math.abs(this.maxY) : this.maxY - this.minY;
        if (this.maxY <= 0) throw new RangeError('maxY out of bounds');
        if (this.maxX <= 0) throw new RangeError('maxX out of bounds');

        this._setUpCanvas();

        // this.y -= this.minY;

        const sx = this.settings.canvasWidth / wi;
        const sy = this.settings.canvasHeight / hi;
        if (sx !== 0 && sy !== 0) {
            this.ctx.scale(sx, sy);
        }

        const newX = this.settings.initX - this.minX;
        const newY = this.settings.initY - this.minY;

        this.ctx.translate(newX, newY);

        this.logger.info('min/max X %d, %d -------> scale %d --> wi = %d', this.minX, this.maxX, sx, wi);
        this.logger.info('min/max Y %d, %d -------> scale %d --> hi = %d', this.minY, this.maxY, sy, hi);
        this.logger.info('Leave resize after scaling %d, %d to %d, %d', sx, sy, this.canvas.width, this.canvas.height);
    }

    _afterRender(content, midiRenderer) {
        this.resizeCanvas();
        this._render({ content, draw: true, midiRenderer });
    };
};

module.exports = LsysRenderer;
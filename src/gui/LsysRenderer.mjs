const log = require('./Logger.mjs');

const RAD = Math.PI / 180.0;

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

    static dsin(radians) {
        return Math.sin(radians * RAD)
    };

    static dcos(radians) {
        return Math.cos(radians * RAD)
    };

    constructor(settings, canvas) {
        this.settings = settings;
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2); // Translate context to center of canvas:

        this.x = this.maxX = this.minX = Number(this.settings.initX);
        this.y = this.maxY = this.minY = Number(this.settings.initY);

        for (let i = 0; i < this.settings.colours.length; i++) {
            this.preparedColours[i] = this.hexAndOpacityToRgba(this.settings.colours[i], this.settings.opacities[i])
        }
        this.setColour(0);
        this.setUpCanvas();
    }

    resize(content) {
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
            this.setUpCanvas();

            this.ctx.scale(sx, sy);

            this.x = Number(this.settings.initX) || 0; // this.settings.turtleStepX|| 0;
            this.y = Number(this.settings.initY) || this.canvas.height / 2;
            this.y -= this.minY;

            this.render({content, draw: true});
            log.verbose('Resized via scale %d, %d', sx, sy);
        }

        log.verbose('Leave resize');
    };

    render({content, draw}) {
        this.penUp = !draw;
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

            log.silly('Do content atom %d, (%s)', i, atom);

            switch (atom) {
                case 'f': // Forwards
                    break;
                case 'c': // Set colour
                    const colourCode = content.charAt(++i);
                    const index = parseInt(colourCode, 10) % this.settings.colours.length;
                    log.silly('Got colour code (%s) made index', colourCode, index);
                    this.setColour(index);
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
                this.turtleGraph(dir);
                this.addNotes(dir);
                this.stepped++;
            }
        }
    }

    addNotes(dir) {
        const startTick = this.noteTick + Math.abs(LsysRenderer.dcos(dir)); // Only move fowards
        const pitchIndex = this.y + LsysRenderer.dsin(dir);
        const duration = startTick - this.noteTick;
        this.noteTick += duration;

        log.silly({ startTick, noteTick: this.noteTick, dir, duration, pitchIndex });

        if (!this.penUp) {
            this.notesContent.on[startTick] = this.notesContent.on[startTick] || [];
            this.notesContent.off[startTick] = this.notesContent.off[startTick] || [];

            this.notesContent.on[startTick].push(pitchIndex);
            this.notesContent.off[startTick].push(duration);
        }
    }

    turtleGraph(dir) {
        log.silly('Move dir (%s) from x (%s) y (%s)', dir, this.x, this.y);

        if (!this.penUp) {
            this.ctx.beginPath();
            // if (this.settings.generationsScaleLines > 0) {
            // this.ctx.lineWidth = this.settings.lineWidth; // * (totalGenerations - currentGenerationNumber);
            // }
            // else if (this.settings.lineWidth) {
            this.ctx.lineWidth = this.settings.lineWidth;
            // }
            this.ctx.moveTo(this.x, this.y);
        }

        this.x += (LsysRenderer.dcos(dir) * this.settings.turtleStepX);
        this.y += (LsysRenderer.dsin(dir) * this.settings.turtleStepY);

        // this.x += this.settings.xoffset;
        // this.y += this.settings.yoffset;

        if (!this.penUp) {
            this.ctx.lineTo(Math.round(this.x), Math.round(this.y));
            this.ctx.closePath();
            log.silly('DRAW in colour ', this.ctx.strokeStyle);
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

    finalise() {
        log.verbose('Enter finalise');
        if (this.settings.finally && typeof this.settings.finally === 'function') {
            log.verbose('Call finally');
            this.settings.finally.call(this);
        }
        log.verbose('Leave finalise');
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

    setColour(colourIndex) {
        this.colour = this.preparedColours[colourIndex];
        log.silly('Set colour to index (%d): ', colourIndex, this.colour, this.settings.colours);
        this.ctx.strokeStyle = this.colour;
    }

    setUpCanvas() {
        this.canvas.width = this.settings.canvasWidth;
        this.canvas.height = this.settings.canvasHeight;
        this.ctx.fillStyle = this.settings.canvasBackgroundColour;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

};

module.exports = LsysRenderer;
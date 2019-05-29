import { LsysParametric } from "./LsysParametric";

import { Presets } from "./presets";

// remember the original reacted to Knob, replicate with new input type=range

export class Ctrls {
    constructor() {}

    init() {
        // this.elTimeDisplay = document.createElement('div');
        // this.elTimeDisplay.class = 'timing';
        // this.elTimeDisplay.innerText = new Date().getTime();
        this.midi = document.getElementById('midi');
        this.createMidi = document.getElementById('createMidi');
        this.generate = document.getElementById('generate');
        this.el_canvases = document.getElementById('canvases');
        this.contentDisplay = document.getElementById('contentDisplay');
        this.setupEventListerners();
        this.installPresets();
        this.loadPreset(0);
    }

    loadPreset(idx) {
        console.log('Load preset ', idx, Presets[idx]);
        Object.keys(Presets[idx]).forEach((i) => {
            console.log('set preset key %s to %s', i, Presets[idx][i]);
            try {
                const el = document.getElementById(i);
                if (el.nodeName === 'INPUT') {
                    el.setAttribute('value', Presets[idx][i]);
                } else if (el.nodeName === 'TEXTAREA') {
                    el.innerText = Presets[idx][i];
                }
            } catch (e) {
                console.error('Could not set ' + i + '.value: missing GUI element? ', e);
            }
        });

        document.getElementById('title').innerText = Presets[idx].title;
    }

    installPresets() {
        var ul = document.getElementById('presets');
        console.log('List presets', Presets);
        Presets.forEach((i, j) => {
            const li = document.createElement('li');
            li.innerText = i.title;
            li.dataset.presetNumber = j;
            li.addEventListener('click', (e) => {
                this.loadPreset(e.target.dataset.presetNumber);
            }, {
                passive: true
            });
            ul.appendChild(li);
        });
    }

    setupEventListerners() {
        this.generate.addEventListener('click', (e) => {
            console.log('Generate')
            this.generate.value = 'Generating...';
            this.generate.disabled = true;
            this.createMidi.disabled = true;

            var options = {};
            Object.keys(Presets[0]).forEach((i) => {
                try {
                    options[i] = document.getElementById(i).value;
                } catch (e) {
                    console.error('Cannot assign options.%s from element of same name', i);
                }
            });

            let canvas = document.createElement('canvas');
            options.canvas = this.el_canvases.insertBefore(canvas, this.el_canvases.firstChild);;

            const lsys = new LsysParametric(options, canvas);
            lsys.generate(options.total_generations);
            if (this.elTimeDisplay) {
                this.elTimeDisplay.innerText = 'Generated in ' + (new Date().getTime() - (elTimeDisplay.get('text'))) + ' ms';
            }

            canvas.scrollIntoView({
                behavior: "smooth",
                block: "end"
            });

            this.contentDisplay.value = lsys.content;
            this.generate.value = 'Generate';
            this.generate.disabled = false;
            this.createMidi.value = 'Generate MIDI';
            this.createMidi.disabled = false;
        }, {
            passive: true
        });

        this.createMidi.addEventListener('click', () => {
            const oldValue = this.createMidi.value;
            this.createMidi.value = 'Hang on...';
            this.createMidi.disabled = true;
            fetch('/cgi-bin/fractal_plant_chords.cgi', {
                duration: document.getElementById('duration').value,
                angle: document.getElementById('angle').value,
                scale: document.getElementById('scale').value
            }).then(() => {
                this.playSound("/cgi-output/cgi.midi");
                this.createMidi.value = oldValue;
                this.createMidi.disabled = false;
            }).catch(() => {
                console.error(e);
                alert('Failure :(');
            })
        }, {
            passive: true
        });
    }
}
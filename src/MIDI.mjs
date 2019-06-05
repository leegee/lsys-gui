const fs = require('fs');

const MidiWriter = require('midi-writer-js');
const JZZ = require('jzz');
require('jzz-synth-osc')(JZZ);
require('jzz-midi-smf')(JZZ);

module.exports = class MIDI {
    static scales = {
        pentatonic: ['E', 'G', 'A', 'B', 'D']
    };

    ready = false;
    options = {};
    outputs = [];
    outputToUse = 1;
    usePorts = {};

    constructor(outputMidiPath) {
        this.outputMidiPath = outputMidiPath;
    }

    async activate(options) {
        Object.keys(options).forEach(option => this[option] = options[option]);
        this.navigator = JZZ;
        this.track = new MidiWriter.Track();

        // const access = await this.navigator.requestMIDIAccess();
        // const outputs = access.outputs.values();
        // let index = 0;

        // for (let output = outputs.next();
        //     output && !output.done;
        //     output = outputs.next()
        // ) {
        //     output.value.open();
        //     this.outputs.push(
        //         await output.value
        //     );
        //     this.usePorts[index++] = true;
        // }

        // access.onstatechange = (e) => {
        //     this.log.log('MIDI', e.port.name, e.port.manufacturer, e.port.state);
        // };

        // this.sendC();

        this.ready = true;
    }

    changeMidiPort(port, state) {
        this.usePorts[port] = state;
    }

    sendC() {
        this.log.info('SEND');
        // const  output = this.outputs.get(portID);
        Object.keys(this.usePorts).forEach(portIndex => {
            if (this.usePorts[portIndex]) {
                this.log.info('SEND ON MIDI PORT', portIndex);
                const output = this.outputs[portIndex];
                console.log(output);
                output.send([0x90, 60, 0x7f]);    // note on, middle C, full velocity
                output.send([0x80, 60, 0x40], this.window.performance.now() + 1000.0); // off
            }
        });
    }

    play(notes, scaleName, duration) {
        if (!MIDI.scales.hasOwnProperty(scaleName)) {
            throw new TypeError('Unknown scale, ' + scaleName);
        }

        this.create(notes, MIDI.scales[scaleName], duration);

        console.log('this.outputMidiPath', this.outputMidiPath);
        try {
            const data = fs.readFileSync(this.outputMidiPath, 'binary');
            const smf = new JZZ.MIDI.SMF(data);
            const player = smf.player();
            // player.connect(JZZ.synth.Tiny());
            player.play();
        } catch (e) {
            console.error(e);
        }
    }

    /**
    @param {object} notes 
    @param {object} notes.on note on values
    @param {object} notes.off note off values
     */
    create(notes, scale, durationScaleFactor) {
        console.log('----------------\n', JSON.stringify(notes, {}, '    '));
        console.log('durationScaleFactor', durationScaleFactor);
        let minVelocity = 50;
        let highestNote = 0;
        let lowestNote = 0;
        let maxNotesInChord = 0;

        Object.keys(notes.on).forEach(index => {
            notes.on[index].forEach(noteValue => {
                if (noteValue >= highestNote) highestNote = noteValue;
                if (noteValue <= lowestNote) lowestNote = noteValue;
            });
            if (notes.on[index].length > maxNotesInChord) maxNotesInChord = notes.on[index].length;
        });

        const noteScaleFactor = highestNote > 127 || lowestNote < 0 ? 127 / (highestNote - lowestNote) : 1;
        console.log('NOTE lo/hi/factor: ', lowestNote, highestNote, noteScaleFactor);

        const velocityScaleFactor = 127 / (127 - minVelocity);
        console.log('VELOCITY min/max notes/factor', minVelocity, maxNotesInChord, velocityScaleFactor);

        const pitchOffset = Math.floor((127 / 2) - ((highestNote - lowestNote) / 2));
        console.log('PITCH OFFSET', pitchOffset);

        Object.keys(notes.on).forEach((startTimeIndex, arrayIndex) => {
            const chordToPlay = {};

            notes.on[startTimeIndex].forEach((noteValue, arrayIndex) => {
                const pitch = pitchOffset + Math.round(noteValue); // Here fit to scale
                const noteIndex = Math.abs(pitch) % scale.length;
                const note = scale[noteIndex];
                const octave = Math.round(Math.abs(pitch) / (127 / 8));
                console.log('---------------', pitchOffset, pitch, noteIndex, note, octave);

                const noteEvent = {
                    pitch: note + octave,
                    duration: 'T' + Math.round(notes.off[startTimeIndex][0] * durationScaleFactor),
                    velocity: Math.round((Object.keys(chordToPlay).length * velocityScaleFactor) + minVelocity),
                    startTick: Math.round(startTimeIndex * durationScaleFactor)
                };
                console.log(noteEvent);

                if (pitch <= 127) {
                    this.track.addEvent(new MidiWriter.NoteEvent(noteEvent));
                } else {
                    console.warn('NOTE OUT OF BOUNDS');
                }
            });
        });

        console.log('Write');
        const writer = new MidiWriter.Writer(this.track);
        writer.saveMIDI(
            this.outputMidiPath.replace(/\.mid$/, '')
        );
        console.log('Written');
    }



}
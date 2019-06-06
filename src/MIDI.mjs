const fs = require('fs');


const MidiWriter = require('midi-writer-js');
const JZZ = require('jzz');
require('jzz-midi-smf')(JZZ);
require('jzz-gui-player')(JZZ);
require('jzz-synth-tiny')(JZZ);
require('jazz-midi-electron')();


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
        JZZ.synth.Tiny.register('Web Audio');
        this.player = new JZZ.gui.Player('player');
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

    play(notes, scaleName, duration) {
        if (!MIDI.scales.hasOwnProperty(scaleName)) {
            throw new TypeError('Unknown scale, ' + scaleName);
        }

        this.create(notes, MIDI.scales[scaleName], duration);

        if (!fs.existsSync(this.outputMidiPath)) {
            throw new Error('No such file', this.outputMidiPath);
        }

        const data = fs.readFileSync(this.outputMidiPath, 'binary');

        var smf = new JZZ.MIDI.SMF(data);
        this.player.stop();
        this.player.load(smf);
        this.player.play();
    }

    /**
    @param {object} notes 
    @param {object} notes.on note on values
    @param {object} notes.off note off values
     */
    create(notes, scale, durationScaleFactor) {
        log.silly('----------------\n', JSON.stringify(notes, {}, '    '));
        log.silly('durationScaleFactor', durationScaleFactor);
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
        log.silly('NOTE lo/hi/factor: ', lowestNote, highestNote, noteScaleFactor);

        const velocityScaleFactor = 127 / (127 - minVelocity);
        log.silly('VELOCITY min/max notes/factor', minVelocity, maxNotesInChord, velocityScaleFactor);

        const pitchOffset = Math.floor((127 / 2) - ((highestNote - lowestNote) / 2));
        log.silly('PITCH OFFSET', pitchOffset);

        Object.keys(notes.on).forEach((startTimeIndex, arrayIndex) => {
            const chordToPlay = {};

            notes.on[startTimeIndex].forEach((noteValue, arrayIndex) => {
                const pitch = pitchOffset + Math.round(noteValue); // Here fit to scale
                const noteIndex = Math.abs(pitch) % scale.length;
                const note = scale[noteIndex];
                const octave = Math.round(Math.abs(pitch) / (127 / 8));
                log.silly('---------------', pitchOffset, pitch, noteIndex, note, octave);

                const noteEvent = {
                    pitch: note + octave,
                    duration: 'T' + Math.round(notes.off[startTimeIndex][0] * durationScaleFactor),
                    velocity: Math.round((Object.keys(chordToPlay).length * velocityScaleFactor) + minVelocity),
                    startTick: Math.round(startTimeIndex * durationScaleFactor)
                };
                log.silly(noteEvent);

                if (pitch <= 127) {
                    this.track.addEvent(new MidiWriter.NoteEvent(noteEvent));
                } else {
                    log.warn('NOTE OUT OF BOUNDS');
                }
            });
        });

        log.log('Write', this.outputMidiPath);
        const writer = new MidiWriter.Writer(this.track);
        const data = writer.buildFile();
        fs.writeFileSync(this.outputMidiPath, data);
        log.log('Written');
    }



}
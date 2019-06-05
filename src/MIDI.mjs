const fs = require('fs');
const path = require('path');
const MidiWriter = require('midi-writer-js');
const JZZ = require('jzz');
require('jzz-synth-osc')(JZZ);
require('jzz-midi-smf')(JZZ);

module.exports = class MIDI {
    ready = false;
    options = {};
    outputs = [];
    outputToUse = 1;
    usePorts = {};
    outputMidiPath = path.resolve('output.mid');

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

    play(notes, duration) {
        this.create(notes, duration);

        console.log('this.outputMidiPath', this.outputMidiPath);
        try {
            const data = fs.readFileSync(this.outputMidiPath, 'binary');
            const smf = new JZZ.MIDI.SMF(data);
            const player = smf.player();
            // player.connect(JZZ.synth.Tiny());
            player.play();
        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    create(notes, durationScaleFactor) {

        durationScaleFactor = 200;

        console.log('----------------\n', JSON.stringify(notes, {}, '    '));
        let minVelocity = 50;
        let highestNote = 0;
        let lowestNote = 0;
        let maxNotesInChord = 0;

        Object.keys(notes).forEach(index => {
            notes[index].forEach(noteValue => {
                if (noteValue >= highestNote) highestNote = noteValue;
                if (noteValue <= lowestNote) lowestNote = noteValue;
            });
            if (notes[index].length > maxNotesInChord) maxNotesInChord = notes[index].length;
        });

        const noteScaleFactor = highestNote > 127 || lowestNote < 0 ? 127 / (highestNote - lowestNote) : 1;
        console.log('NOTE lo/hi/factor: ', lowestNote, highestNote, noteScaleFactor);

        const velocityScaleFactor = 127 / (127 - minVelocity);
        console.log('VELOCITY min/max notes/factor', minVelocity, maxNotesInChord, velocityScaleFactor);

        const pitchOffset = Math.floor((127 / 2) - ((highestNote - lowestNote) / 2));
        console.log('PITCH OFFSET', pitchOffset);

        Object.keys(notes).forEach(index => {
            const chordToPlay = {};

            notes[index].forEach(noteValue => {
                const translatedNote = pitchOffset + Math.round(noteValue); // Here fit to scale
                console.log('Created ', translatedNote);

                if (chordToPlay.hasOwnProperty(translatedNote)) {
                    chordToPlay[translatedNote].velocity++;
                } else {
                    chordToPlay[translatedNote] = { velocity: 1 };
                }
            });

            console.log('chordToPlay', chordToPlay);
            console.log('velocityScaleFactor', velocityScaleFactor);

            Object.keys(chordToPlay).forEach(pitch => {
                const noteEvent = {
                    pitch,
                    duration: 'T' + durationScaleFactor,
                    velocity: (Object.keys(chordToPlay).length * velocityScaleFactor) + minVelocity,
                    startTick: index * durationScaleFactor
                };
                console.log('ADD NOTE', noteEvent);
                this.track.addEvent(new MidiWriter.NoteEvent(noteEvent));
            });

        });

        const writer = new MidiWriter.Writer(this.track);
        writer.saveMIDI(
            this.outputMidiPath.replace(/\.mid$/, '')
        );
    }



}
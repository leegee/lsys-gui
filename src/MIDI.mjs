const fs = require('fs');

const tonal = require("tonal");

const MidiWriter = require('midi-writer-js');
const JZZ = require('jzz');
require('jzz-midi-smf')(JZZ);
require('jzz-gui-player')(JZZ);
require('jzz-synth-tiny')(JZZ);
require('jzz-synth-osc')(JZZ);
require('jazz-midi-electron')();

const log = require('./gui/Logger.mjs');

module.exports = class MIDI {
    options = {};
    outputs = [];
    outputToUse = 1;
    usePorts = {};

    constructor(options) {
        JZZ.synth.Tiny.register('Web Audio');
        JZZ.synth.OSC.register('OSC');
        this.player = new JZZ.gui.Player({
            at: 'player',
            ports: ['OSC', 'Web Audio']
        });

        Object.keys(options).forEach(option => this[option] = options[option]);
    }

    play(notes, scaleName, duration) {
        const scaleOfNoteLetters = tonal.Scale.notes('A ' + scaleName);
        this.create(notes, scaleOfNoteLetters, duration);

        if (!fs.existsSync(this.outputMidiPath)) {
            throw new Error('No such file', this.outputMidiPath);
        }

        const data = fs.readFileSync(this.outputMidiPath, 'binary');
        try {
            var smf = new JZZ.MIDI.SMF(data);
            this.player.stop();
            this.player.load(smf);
            this.player.play();
        } catch (e) {
            console.error(e);
        }
    }

    /**
    @param {object} notes 
    @param {object} notes.on note on values
    @param {object} notes.off note off values
     */
    create(notes, scaleOfNoteLetters, durationScaleFactor) {
        log.silly('create---------------->', JSON.stringify(notes, {}, '    '));
        log.silly('durationScaleFactor', durationScaleFactor);
        let minVelocity = 50;
        let highestNote = 0;
        let lowestNote = 0;
        let maxNotesInChord = 0;

        this.track = new MidiWriter.Track();

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

        let timeOffset = Math.min(...Object.keys(notes.on));
        if (timeOffset < 0) {
            timeOffset = Math.ceil(Math.abs(timeOffset));
        } else {
            timeOffset = 0;
        }
        log.silly('Time Offset', timeOffset);

        Object.keys(notes.on).forEach((startTimeIndex, arrayIndex) => {
            const chordToPlay = {};

            notes.on[startTimeIndex].forEach((noteValue, arrayIndex) => {
                const pitch = pitchOffset + Math.round(noteValue); // Here fit to scale
                const noteIndex = Math.abs(pitch) % scaleOfNoteLetters.length;
                const note = scaleOfNoteLetters[noteIndex];
                const octave = Math.round(Math.abs(pitch) / (127 / 8));
                log.silly({ startTimeIndex, pitchOffset, pitch, noteIndex, note, octave, durationScaleFactor, timeOffset });

                const noteEvent = {
                    pitch: note + octave,
                    duration: 'T' + Math.ceil((notes.off[startTimeIndex][0] + timeOffset) * durationScaleFactor),
                    velocity: Math.ceil((Object.keys(chordToPlay).length * velocityScaleFactor) + minVelocity),
                    startTick: Math.ceil((timeOffset + startTimeIndex) * durationScaleFactor)
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
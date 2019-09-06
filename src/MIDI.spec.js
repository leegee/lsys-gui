"use strict";

const expect = require('chai').expect;
const MIDI = require("./MIDI.mjs");

describe('MIDI', () => {
    [
        [10, 10],
        [0, 127],
        [126, 127],
        [1, 1],
        [-46.39246720071793, 52.820343297583335]
    ].forEach(([lowestNote, highestNote]) => {
        it('pitchOffset ' + lowestNote + '-' + highestNote, () => {
            const offset = MIDI.pitchOffset(lowestNote, highestNote);
            console.log('offset ', offset, ' low/hi/mid = ', lowestNote+offset, highestNote+offset, highestNote+offset- lowestNote);
            expect(offset).to.be.within(0, 127);
        });
    });
});

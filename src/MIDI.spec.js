"use strict";

const expect = require('chai').expect;
const MIDI = require("./MIDI.mjs");

describe('MIDI', () => {
    [
        [10, 10]
    ].forEach(([lowestNote, highestNote]) => {
        it('pitchOffset', () => {
            expect(
                MIDI.pitchOffset(lowestNote, highestNote)
            ).to.be.within(0, 127);
});
    });
});

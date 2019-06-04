module.exports = class MIDI {
    ready = false;
    options = {};
    outputs = [];
    outputToUse = 1;
    usePorts = {};

    async activate(options) {
        Object.keys(options).forEach(option => this[option] = options[option]);
        const access = await this.navigator.requestMIDIAccess();
        const outputs = access.outputs.values();
        let index = 0;

        for (let output = outputs.next();
            output && !output.done;
            output = outputs.next()
        ) {
            this.outputs.push(
                await output.value.open()
            );
            this.usePorts[index++] = true;
        }

        access.onstatechange = (e) => {
            this.log.log('MIDI', e.port.name, e.port.manufacturer, e.port.state);
        };

        this.sendC();

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

    writeFile(noteCodes) {
        console.info('noteCodes', noteCodes);
    }
}
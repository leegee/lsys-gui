module.exports = class MIDI {

    ready = false;
    options = {};
    outputs = null;

    constructor(options = {}) {
        this.options = options;
    }

    async activate(navigator) {
        this.navigator = navigator;
        const access = await this.navigator.requestMIDIAccess();
        this.outputs = access.outputs.values();

        access.onstatechange = (e) => {
            // Print information about the (dis)connected MIDI controller
            console.log(e.port.name, e.port.manufacturer, e.port.state);
        };
        this.ready = true;
    }
}
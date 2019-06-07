const electron = require('electron');

const GUI = require('./GUI.mjs');
const handleError = require('./Electron-error.mjs');
const appConfig = require('../../app.config');

window.addEventListener('error', event => {
    event.preventDefault();
    handleError('Unhandled Error', event.error);
});

window.addEventListener('unhandledrejection', event => {
    event.preventDefault();
    handleError('Unhandled Promise Rejection', event.reason);
});

window.addEventListener('DOMContentLoaded', () => {
    const elements = [
        'canvases', 'midiPorts',
        'viewMain', 'viewSettings',
        'actionViewMain', 'actionGenerate', 'actionCreateMidi', 
    ].reduce((o, key) => {
        o[key] = window.document.getElementById(key);
        return o;
    }, {});

    console.log('-----------', navigator);

    const gui = new GUI({
        initialPreset: appConfig.dev ? 0 : 0,
        navigator,
        window,
        appConfig,
        elements
    });

    gui.init();
});



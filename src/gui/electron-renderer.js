const electron = require('electron');

const GUI = require('./gui.mjs');
const handleError = require('./electron-error.mjs');
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
        'canvases',
        'viewMain', 'viewSettings',
        'actionGenerate', 'actionCreateMidi', 'actionViewMain'
    ].reduce((o, key) => {
        o[key] = window.document.getElementById(key);
        return o;
    }, {});

    const gui = new GUI({
        window,
        appConfig,
        elements
    });

    gui.init();
});



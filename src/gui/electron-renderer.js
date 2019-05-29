const GUI = require('./gui.mjs');
const appConfig = require('../../app.config');

const handleError = require('./electron-error.mjs');

window.addEventListener('error', event => {
    event.preventDefault();
    handleError('Unhandled Error', event.error);
});

window.addEventListener('unhandledrejection', event => {
    event.preventDefault();
    handleError('Unhandled Promise Rejection', event.reason);
});

const elements = [
    'viewMain', 'viewSettings', 'actionGenerate', 'actionCreateMidi', 'canvases'
].reduce((o, key) => {
    o[key] = window.document.getElementById(key);
    return o;
}, {});

console.log(elements);

const gui = new GUI({
    window,
    appConfig,
    elements
});

gui.init();


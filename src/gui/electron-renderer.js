const appConfig = require('../../app.config');
const ChromiumClient = require('../chromium/chromium-client.mjs');
const { remote } = require('electron');
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
    'user', 'pass', 'host', 'port', 'remotepath',
    'countyFillOpacity', 'countyFillColour', 'countyBorderColour', 'countyBorderOpacity', 'mapTileUrl',
    'statesBorderColour', 'statesBorderOpacity', 'showStates', 'states',
    'initialZoom', 'minZoom', 'maxZoom', 'initialLat', 'initialLng',
    'skus', 'help', 'deployView', 'settingsView',
    'deployAction', 'deployAction', 'settingsAction',
    'progress', 'status', 'bar', 'initView'
].reduce((o, key) => {
    o[key] = document.getElementById(key);
    return o;
}, {});

const client = new ChromiumClient({
    menu: {
        Menu: remote.Menu,
        MenuItem: remote.MenuItem,
    },
    window,
    appConfig,
    elements: {
        skuTemplate: document.getElementById('sku-entry-template'),
        skuList: document.getElementById("sku-list"),
        progressTitle: document.getElementById("progress-title"),
        ...elements
    },
});

client.init();


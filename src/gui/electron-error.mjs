// Thanks to https://github.com/sindresorhus/electron-unhandled/blob/master/index.js

const electron = require('electron');
const cleanStack = require('clean-stack');
const log = require('electron-log');

const app = electron.app || electron.remote.app;
const clipboard = electron.clipboard || electron.remote.clipboard;
const dialog = electron.dialog || electron.remote.dialog;

module.exports = (title, error) => {
    console.log(error);

    try {
        log.error(error);
    } catch (e) {
        dialog.showErrorBox('The `logger` option function in electron-unhandled threw an error', ensureError(e).stack);
        return;
    }

    const stack = cleanStack(error.stack);

    if (app.isReady()) {
        // Intentionally not using the `title` option as it's not shown on macOS
        const buttonIndex = dialog.showMessageBox({
            type: 'error',
            buttons: ['OK',
                process.platform === 'darwin' ? 'Copy Error' : 'Copy error'
            ],
            defaultId: 0,
            noLink: true,
            message: title,
            detail: cleanStack(error.stack, { pretty: true })
        });

        if (buttonIndex === 1) {
            clipboard.writeText(`${title}\n${stack}`);
        }

    }

    else {
        dialog.showErrorBox(title, stack);
    }
};

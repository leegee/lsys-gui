const fs = require('fs');
const log = require('electron-log');

// log.transports.file.level =
//     log.transports.console.level =
//     log.transports.rendererConsole =
//     log.transports.mainConsole = process.env.LOG_LEVEL || 'warn';

// const log = console; log.silly = log.verbose = log.debug = log.log; log.x = console.info;
// const log = {
//     silly: () => { },
//     info: () => { },
//     log: () => { },
//     trace: () => { },
//     verbose: () => { },
//     debug: () => { },
//     x: (...args) => {
//         console.log(args);
//     },
//     error: (...args) => {
//         console.error(args);
//     }
// }

log.findLogPath = log.transports.file.findLogPath;

const logPath = log.findLogPath();

process.stdout.write('\nLog file: ' + logPath + '\n');

log.transports.file.clear = () => {
    if (fs.existsSync(logPath)) {
        try {
            fs.unlinkSync(logPath);
            process.stdout.write('leard log\n');
        } catch (e) {
            process.stderr.write('Could not clear log! ' + e.name + ': ' + e.message + '\n');
        }
    }
};

log.transports.file.clear();

module.exports = log;

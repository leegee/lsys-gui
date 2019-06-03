const fs = require('fs');
const log = require('electron-log');

log.transports.file.level =
    log.transports.console.level = process.env.LOG_LEVEL || 'error';

// log.transports.rendererConsole.level = process.env.LOG_LEVEL || 'warn';
// log.transports.mainConsole.level = process.env.LOG_LEVEL || 'warn';

log.transports.console.forceStyles = 1;

process.stdout.write(
    '---------------------\n' +
    'env.LOG_LEVEL: ' + (process.env.LOG_LEVEL || '') + '\n' +
    'Set log level: ' + log.transports.file.level + '\n' +
    '---------------------\n'
)

log.findLogPath = log.transports.file.findLogPath;

const logPath = log.findLogPath();

process.stdout.write('\nLog file: ' + logPath + '\n');

log.transports.file.clear = () => {
    if (fs.existsSync(logPath)) {
        try {
            fs.unlinkSync(logPath);
            process.stdout.write('Cleard log\n');
        } catch (e) {
            process.stderr.write('Could not clear log! ' + e.name + ': ' + e.message + '\n');
        }
    }
};

log.transports.file.clear();

module.exports = log;

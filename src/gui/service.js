const fs = require('fs');
const path = require('path');

const log = require('./electron-log.mjs');
const LsysParametric = require('../LsysParametric.mjs');

const start = (args) => {
    const lsys = new LsysParametric({
        ...args,
        logger: log,
        postRenderCallback: () => { alert('postRenderCallback') }
    });
    lsys.generate(args.totalGenerations);
    process.send({ cmd: 'call', methodName: 'lsysDone', content: lsys.content });
}

process.on('uncaughtException', error => {
    log.error('CHILD UNCAUGHT EXCEPTION:', error);
    process.send({ cmd: 'error', title: 'Unhandled Error', ...error });
    process.exit(-1);
});

process.on('unhandledRejection', reason => {
    log.log('reason', reason.name + ' ' + reason.message);
    process.send({ cmd: 'error', title: 'Unhandled Rejection', ...reason });
    process.exit(-2);
});

process.on('message', (msg) => {
    log.log('Child got msg', msg);
    switch (msg.cmd) {
        case 'start':
            start(msg);
            break;
        default:
            log.log('unknown command', msg);
    }
});


const DailyRotateFile = require('winston-daily-rotate-file');
const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports = (winston) => {
  const config = require('../config');
  const logFormatter = (args) => {
    let logMessage = new Date().toISOString() + '|' + args.level.toUpperCase() + '|' + os.hostname();
    logMessage += '|' + args.message;
    return logMessage;
  };
  fs.existsSync(config.logLocation) || fs.mkdirSync(config.logLocation);
  winston.add(DailyRotateFile, {
    filename: path.join(config.logLocation, config.logFileName),
    datePattern: 'yyyy-MM-dd.',
    prepend: true,
    prettyPrint: true,
    // formatter: logFormatter,
    handleExceptions: true,
    exitOnError: false,
    json: false,
    level: 'debug'
  });
  // winston.remove(winston.transports.Console);
};


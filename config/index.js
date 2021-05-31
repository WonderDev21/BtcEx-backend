// require('dotenv').config();
const _ = require('lodash');
const appConfig = require('./appConfig');
const {NODE_ENV, CLIENT_PORT} = require('../setup/env');

const config = {
  test: {
    S3_BUCKET_NAME: 'coinmint-stage',
    dbName: 'trade-test',
    baseURL: process.env.baseURL || `http://localhost:${CLIENT_PORT}`,
    userName: 'postgres',
    password: '2311',
    host: 'localhost',
    logFileName: 'trade-test-logs.log',
    SLACK_TOKEN: process.env.SLACK_TOKEN || 'xoxb-266916329430-HGeVlTfrS4IcWoLbvm2zrmCI',
    JOB_SECRET: process.env.JOB_SECRET || '95A9et9nka48l98&eKJk',
    RIPPLE_SERVER: 'wss://s.altnet.rippletest.net:51233',
    RIPPLE_ADDRESS: 'rHn9LvAumdiS1Gvuz9uVJdjE5Xs113GYj2',
    RIPPLE_SECRET_KEY: 'ssBHm8y7Cs9d9nsGWVykHrfUNYGRB',
  },
  development: {
    S3_BUCKET_NAME: 'coinmint-stage',
    dbName: 'trade-backend',
    baseURL: process.env.baseURL || `http://localhost:${CLIENT_PORT}`,
    userName: 'postgres',
    password: process.env.DB_PASSWORD || '2311',
    host: '127.0.0.1',
    logFileName: 'trade-dev-logs.log',
    SLACK_TOKEN: process.env.SLACK_TOKEN || 'xoxb-266916329430-HGeVlTfrS4IcWoLbvm2zrmCI',
    JOB_SECRET: process.env.JOB_SECRET || '95A9et9nka48l98&eKJk',
    JOB_SERVER_PATH: process.env.JOB_SERVER_PATH || 'http://localhost:7777',
    RIPPLE_SERVER: 'wss://s.altnet.rippletest.net:51233',
    RIPPLE_ADDRESS: 'rHn9LvAumdiS1Gvuz9uVJdjE5Xs113GYj2',
    RIPPLE_SECRET_KEY: 'ssBHm8y7Cs9d9nsGWVykHrfUNYGRB',
  },
  production: {
    S3_BUCKET_NAME: 'coinmint-prod',
    dbName: 'trade-backend',
    userName: 'postgres',
    password: process.env.DB_PASSWORD || '2311',
    host: '127.0.0.1',
    baseURL: process.env.baseURL || 'https://www.btcex.pro',
    logFileName: 'trade-prod-logs.log',
    SLACK_TOKEN: process.env.SLACK_TOKEN || 'xoxb-264921920480-e4LnSfXGN0BhTIxCBkogmTcm',
    JOB_SECRET: process.env.JOB_SECRET || 'J^F#4*^o6#tMdDuZjdcc',
    JOB_SERVER_PATH: process.env.JOB_SERVER_PATH || 'http://139.59.76.126:7777',
    RIPPLE_SERVER: 'wss://s1.ripple.com:443',
    RIPPLE_ADDRESS: 'rBkKHhUJMJnnwmw6aeu4W1dBYNFL6vseoN',
    RIPPLE_SECRET_KEY: 'ssKPDunGPQMgibSaUKcExJ1wVqZBn',
  },
  staging: {
    S3_BUCKET_NAME: 'coinmint-stage',
    dbName: 'trade-staging',
    userName: 'postgres',
    password: process.env.DB_PASSWORD || '2311',
    host: '127.0.0.1',
    baseURL: 'http://172.104.36.253',
    logFileName: 'trade-staging-logs.log',
    SLACK_TOKEN: process.env.SLACK_TOKEN || 'xoxb-266916329430-HGeVlTfrS4IcWoLbvm2zrmCI',
    JOB_SECRET: process.env.JOB_SECRET || '95A9et9nka48l98&eKJk',
    JOB_SERVER_PATH: process.env.JOB_SERVER_PATH || 'http://172.104.36.253:7777',
    RIPPLE_SERVER: 'wss://s.altnet.rippletest.net:51233',
    RIPPLE_ADDRESS: 'rHn9LvAumdiS1Gvuz9uVJdjE5Xs113GYj2',
    RIPPLE_SECRET_KEY: 'ssBHm8y7Cs9d9nsGWVykHrfUNYGRB',
  }
};
module.exports = _.assign({}, config[NODE_ENV], appConfig);

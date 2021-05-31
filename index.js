const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');
const morgan = require('morgan');
const Raven = require('raven');
const dotEnv = require('dotenv');
dotEnv.config();
// Must configure Raven before doing anything else with it
Raven.config('https://e4f20879bd074f8db9d66b5494f5ecb0@sentry.io/626561').install();
const rfs = require('rotating-file-stream');
const os = require('os');
const connect_datadog = require('connect-datadog');
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const rollbar = require('./setup/rollbar');
const {PORT, NODE_ENV} = require('./setup/env');
const {getSupportedCurrencies} = require('./setup/currency');
getSupportedCurrencies().then(c => global.SUPPORTED_CURRENCIES = c);
// const connectMongo = require('./setup/mongo');
// connectMongo();
// const initJobs = require('./worker/initJob');
const {channelNames} = require('./constants/channelConstants');

const config = require('./config');
const channel = require('./setup/channel.js');
const slackBot = require('./setup/bot.js');
if (NODE_ENV !== 'development') {
  slackBot.start();
  rollbar();
}
// const {connectWeb3} = require('./setup/web3.js');

// connectWeb3();

// const {connectRipple} = require('./setup/ripple');
// connectRipple();

const Socket = require('./setup/socket.js');
// const Queue = require('./setup/queue.js');

const globalChannel = new Socket(channelNames.TRADE, io);
// const globalQueue = new Queue(config.CLOUDAMQP_URL, globalChannel);

channel.setChannel(channelNames.TRADE, globalChannel);
// channel.setChannel(channelNames.QUEUE, globalQueue);


const sequelize = require('./models');

require('./setup/logs')(require('winston'));

const logger = require('winston');

const accessLogStream = rfs('access.log', {
  interval: '1d', // rotate daily
  path: config.logLocation,
});

// app.use(cors());

// The request handler must be the first middleware on the app
app.use(Raven.requestHandler());
app.set('x-powered-by', false);
app.use(bodyParser.urlencoded({limit: '20mb', extended: true}));
app.use(bodyParser.json({limit: '20mb'}));
app.use(cookieParser());
app.use(Raven.errorHandler());
if (NODE_ENV !== 'development') {
  const stat = 'Coinmint' + '.' + NODE_ENV;
  const tags = ['Coinmint', NODE_ENV, os.hostname()];
  app.use(connect_datadog({
    'response_code': true,
    stat: stat,
    tags: tags
  }));
}

sequelize.authenticate()
  .then((err) => {
    if(err) {
      logger.error('Some error while authenticating database', err);
    } else {
      logger.info('Connection established successfully to database');
      console.log('Connection has been established successfully.');
    }
  })
  .catch(err => {
    logger.error('Unable to connect to the database', err);
  });
if(NODE_ENV !== 'test') {
  sequelize.sync().then((res) => {
  require('./controllers/').createServerAccount()
  .then(() => {
    logger.info('Models synced');
      app.get('/status', function(req, res) {
        res.sendFile(path.join(__dirname, 'socket.html'));
      });
      const startOrderProcessor = require('./order_worker/orderProcessor.js');
      const startKYCWorker = require('./worker/sumsub');
      const transactionWorker = require('./worker/transaction');
      startKYCWorker();
      startOrderProcessor();
      transactionWorker.bindAllQueues()
      .then(() => {
        transactionWorker.startDepositConsumer();
        transactionWorker.startWithdrawConsumer();
        // transactionWorker.startWalletConsumer();
      });
    });
  });
}

const routes = require('./routes');
// const mongoRoutes = require('./mongo/routes');
app.use(compression());
if (NODE_ENV === 'development') {
  app.use(function(req, res, next) {
    console.log('\n');
    console.log('------------- API CALL -------------');
    console.log('[' + req.method + ']: ' + req.originalUrl + '');
    console.log('[HEADERS]: ' + JSON.stringify(req.headers));
    console.log('[QUERY]: ' + JSON.stringify(req.query));
    console.log('[PARAMS]: ' + JSON.stringify(req.params));
    console.log('[BODY]: ' + JSON.stringify(req.body));
    console.log('\n');
    next();
  });
}
app.use(morgan('[:date[iso]] :response-time ms ":method :url" :status :res[content-length] :remote-addr - :remote-user ":referrer" ":user-agent"', {stream: accessLogStream}));
app.use('/', routes);
// app.use('/s2', mongoRoutes);

app.use(function (err, req, res, next) {
  const {MessageTypes} = require('./constants/slackConstants.js');
  const sendAdminNotification = require('./deployments/postMessage.js');
  logger.error(`Something went wrong on path ${req.path}`, err.stack);
  sendAdminNotification(MessageTypes.SERVER_BUG, {error: err.stack, path: req.path});
  res.status(500).send({message: 'Something went wrong. try again!'});
});
// initJobs();
// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  res.statusCode = 500;
  res.end(res.sentry + '\n');
});

http.listen(PORT, function() {
  console.info('Server running on PORT '+ PORT);
  logger.info('Server running on PORT '+ PORT);
});

module.exports = {
  app: app,
  sequelize: sequelize
};

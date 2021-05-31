var mongoose = require('mongoose');
const logger = require('winston');
const config = require('../config');
mongoose.Promise = require('bluebird');
function connect() {
  mongoose.connect(config.MONGODB_URI);

  mongoose.connection.on('open', function(){
    logger.info('MongoDB connection opened');
  });
  mongoose.connection.on('error', function(){
    logger.error('Error connecting to MongoDB');
  });
  mongoose.connection.on('disconnected', function(){
    logger.warn('Disconnected from MongoDB');
  });
  mongoose.connection.on('reconnected', function(){
    logger.info('Re-connected to MongoDB');
  });
}

module.exports = connect;


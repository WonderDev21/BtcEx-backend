
const accountService = require('../services/account.service');
const logger = require('winston');
const User = require('../models').models.User;
const _ = require('lodash');
const {SERVER_ACCOUNT} = require('../config');

exports.createServerAccount = async () => {
  try {
    const serverId = SERVER_ACCOUNT.userId;
    logger.info('Creating server account');
    const serverExists = await User.findById(serverId);
    if(!serverExists) {
      const server = await User.create(SERVER_ACCOUNT);
      const accounts = await accountService.createAccount(server);
      logger.info('Server Account created');
    } else {
      logger.info('Server account already exists');
    }
    return null;
  } catch(error) {
    logger.error('Some error occured while creating server account', error);
    return error;
  }
};

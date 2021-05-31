const logger = require('winston');
const _ = require('lodash');
const accountService = require('../services/account.service');
const redisService = require('../services/redis.service');
const adminService = require('../services/admin.service');
const userService = require('../services/user.service');
const transactionService = require('../services/transaction.service');
const channel = require('../setup/channel.js');
const {channelNames} = require('../constants/channelConstants');
const redisConstants = require('../constants/redisConstants');
const {allowedTypes} = require('../constants/tradeConstants');
const globalQueue = channel.getChannel(channelNames.TRADE);

exports.announceUsers = async (req, res) => { // expireTime is in seconds
  const {msg, expireTime = 0} = req.body;
  /*
  msg = {
    type: '' // warning, danger
    html: '', // html message,
    misc: '' // for something else
  }
   */
  if (isNaN(Number(expireTime))) {
    res.status(400).send({error: 'Enter expiry time in seconds'});
    return;
  }
  const redisMessage = typeof (msg) === 'string' ? msg : JSON.stringify(msg);
  try {
    if (Number(expireTime)) {
      const resp = await redisService.setExpire(redisConstants.ANNOUNCEMENT, redisMessage, Number(expireTime));
    } else {
      const resp = await redisService.setValue(redisConstants.ANNOUNCEMENT, redisMessage);
    }
    globalQueue.sendNewAnnouncement();
    res.status(200).send({message: 'Announcement published successfully'});
  } catch(err) {
    res.status(200).send({message: 'Failed to publish announcement.'});
  }
};
exports.clearAnnouncement = async (req, res) => {
  try {
    const redisResp = await redisService.deleteValue(redisConstants.ANNOUNCEMENT);
    logger.info('Deleted announcement with response', redisResp);
    globalQueue.sendNewAnnouncement();
    res.status(200).send({message: 'Deleted Announcement'});
  } catch(error) {
    logger.error('Error deleting announcement with error', error);
    res.status(400).send({message: 'Error deleting announcement', error});
  }
};
exports.sendKYCReminder = async (req, res) => {
  try {
    const status = await adminService.sendKYCReminder();
    res.status(200).send({message: 'Sent'});
  } catch(err) {
    logger.error("Couldn't send KYC reminder email to users");
    res.status(400).send({message: 'Email sending failed', error: err});
  }
};
exports.updateSupportedCurrency = async (req, res) => {
  const list = req.body;
  if (Array.isArray(list)) {
    const x = await redisService.setValue(redisConstants.SUPPORTED_CURRENCIES, list);
    res.status(200).send({message: 'Currency Updated'});
  } else {
    res.status(400).send({message: 'Currency Update Failed'});
  }
};
exports.addAccount = async (req, res) => {
  const userId = req.params.userId;
  const currencies = req.body.currencies;
  try {
    const accounts = adminService.addAccount(userId, currencies);
    res.status(200).send(accounts);
  } catch(err) {
    res.status(400).send({message: 'Adding account failed', error: err});
  }
};
exports.getUserStatement = async (req, res) => {
  //
};
exports.getAllUserBankDetails = async (req, res) => {
  // todo
};
exports.getPendingWithdrawalRequest = async (req, res) => {
  // only pending ones
};
exports.updateWalletAddress = async(req, res) => {
  const accountId = req.params.accountId;
  const currency = req.query.currency;
  const type = req.query.type;
  const key = req.query.key;
  if (currency === 'MIOTA') { // for now only MIOTA updates
    const updatedAccount = await adminService.updateIOTAAddress(accountId, type, key);
    res.status(200).send(updatedAccount);
  }
};

exports.verifyKYC = async (req, res) => {
  const status = req.body.status;
  const userId = req.params.userId;
  try {
    const prevUser = await userService.getUserById(userId);
    if (prevUser.kycVerified !== kycStatus) {
      const updatedUser = await User.update({kycVerified: status},
        {
          attributes: ['kycVerified'],
          where: {userId: userId},
          returning: true,
          plain: true
      });
      const updatedUserObj = objectToJSON(updatedUser[1]);
      logger.info(`User ${updatedUserObj.email} KYC status changed to ${status}`);
      res.status(200).send({message: 'User KYC has been verified', error});
    }
  } catch(err) {
    res.status(400).send({message: 'Failed', error: err});
  }
};

exports.getTransaction = async (req, res) => {
  const transactionId = req.params.transactionId;
  try {
    const txnObj = await transactionService.getTransactionById(transactionId);
    res.status(200).send(txnObj);
  } catch(err) {
    res.status(400).send({message: 'Failed', error: err});
  }
};

exports.updateKYC = async(req, res) => {

};

exports.getTradeInvoices =  async(req, res) => {
  try {
    const invs = await  adminService.getInvoices();
    res.status(200).send(invs);
  } catch(err) {
    res.status(200).send({message: 'Error Fetching invoices', err});
  }
};

const Request = require('axios');
const logger = require('winston');
const config = require('../config');
const crypto = require('crypto');
const _ = require('lodash');
const {MessageTypes} = require('../constants/slackConstants.js');
const sendAdminNotification = require('../deployments/postMessage.js');

const secret = config.JOB_SECRET;
const genHash = function() {
  const time = String(parseInt(Date.now()/1000) * 1000);
  const hash = crypto.createHmac('sha256', secret).update(time).digest('base64');
  const obj = {msg_mac: hash, tc: time};
  return JSON.stringify(obj);
};
function makeRequest(method, api = '/status', data) {
  const url = api.substr(0, 4) === 'http' ? api : `${config.JOB_SERVER_PATH}/${api}`;
  return Request[method](url, data, {
    headers: {
      'x-access-token': genHash(),
    },
  })
  .then(r => r);
}
// exports.depositCoins = (data) => {
//   return makeRequest('post', 'api/transaction/deposit', data)
//   .then(resp => {
//     logger.info('Deposit Coin Success', resp.data);
//     sendAdminNotification(MessageTypes.COIN_DEPOSIT_INIT,
//       {currency: data.currency, email: data.email, amount: data.amount});
//   })
//   .catch(error => {
//     logger.info('Deposit Coin failed', _.get(error, 'response.data', error));
//     sendAdminNotification(MessageTypes.COIN_DEPOSIT_FAILED,
//       {currency: data.currency, email: data.email, amount: data.amount});
//   });
// };
exports.createAccount = (data) => {
  return makeRequest('post', 'api/user/addNew', data)
  .then(resp => {
    logger.info('KYC info added to Job Server', resp.data);
      return resp.data;
  })
  .catch(error => {
    logger.error('adding KYC info failed to Job Server', _.get(error, 'response.data', error));
    return {success: false, error};
  });
};
exports.updateAccount = (data) => {
  return makeRequest('put', 'api/user/update', data)
  .then(resp => {
    logger.info('KYC info updated in Job Server', resp.data);
      return {success: true,  data: resp.data};
  })
  .catch(error => {
    logger.error('updating KYC info failed to Job Server', _.get(error, 'response.data', error));
    return {success: false, error};
  });
};
exports.withdrawCoins = (data) => {
  return makeRequest('post', 'api/transaction/withdraw', data)
  .then(resp => {
    logger.info('Withdraw Coin Success', resp.data);
    sendAdminNotification(MessageTypes.COIN_WITHDRAWAL_INIT,
      {currency: data.currency, email: data.email, amount: data.amount});
      return resp.data;
  })
  .catch(error => {
    logger.error('Withdraw Coin failed', _.get(error, 'response.data', error));
    sendAdminNotification(MessageTypes.COIN_WITHDRAWAL_FAILED,
      {currency: data.currency, email: data.email, amount: data.amount});
    return {success: false, error};
  });
};
exports.withdrawINR = (data) => {
  return makeRequest('post', 'api/transaction/withdrawINR', data)
  .then(resp => {
    logger.info('Withdraw INR Success', resp.data);
    sendAdminNotification(MessageTypes.COIN_WITHDRAWAL_INIT,
      {currency: data.currency, email: data.email, amount: data.amount});
    return resp.data;
  })
  .catch(error => {
    logger.error('Withdraw INR failed', _.get(error, 'response.data', error));
    sendAdminNotification(MessageTypes.COIN_WITHDRAWAL_FAILED,
      {currency: data.currency, email: data.email, amount: data.amount});
    return {success: false, error};
  });
};
exports.createInvoice = (data) => {
  return makeRequest('post', 'api/invoice/new', data)
  .then(resp => {
    logger.info('Invoice Request Queued', resp.data);
    return {success: true,  data: resp.data};
  })
  .catch(error => {
    logger.error('Invoice Request Failed', _.get(error, 'response.data', error));
    return {success: false, error};
  });
};

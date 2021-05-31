const poloneixService = require('../services/poloneix.service');
const smsService = require('../services/sms.service');

module.exports = (args) => {
  return new Promise(async (resolve, reject) => {
    console.log('Sending sms: ', args.mobile);
    try {
      const smsReq = {
        to: args.mobile,
        text: 'Welcome to Trade',
      }
      // const smsResponse = await smsService.sendSMS(smsReq);
      resolve('done');
    } catch(err) {
      console.log("Error", err);
      reject(err);
    }
  });
};
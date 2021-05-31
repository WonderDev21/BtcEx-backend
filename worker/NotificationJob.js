const emailService = require('../services/email.service');
const orderService = require('../services/order.service');
const poloneixService = require('../services/poloneix.service');
const smsService = require('../services/sms.service');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const dailyMail = fs.readFileSync(path.join(process.cwd(), 'mailer/output/dailyMail.html'));
const basicMail = fs.readFileSync(path.join(process.cwd(), 'mailer/output/basicTemplate.html'));
const moment = require('moment');
const { verificationEmailOptions } = require('../constants/serverConstants');

module.exports = (args) => {
  return new Promise(async (resolve, reject) => {
    console.log('Sending mail: ', args.email);
    const compiled = _.template(basicMail);
    try {
      const currencyData = await poloneixService.getPrice();
      // console.log('currencyData', currencyData);
      const currentTime = `As of ${moment().format('MMMM Do YYYY, h:mm:ss a')}`;
      // const output = compiled({data: currencyData, currentTime});
      const ObjectMail = {
        from: verificationEmailOptions.senderEmail,
        to: args.email,
        subject: 'Trade Update',
        html: basicMail,
      };
      // const emailResponse = await emailService.sendEmail(ObjectMail);
      const emailResponse = await orderService.sendMailForPlacedOrder();
      resolve('done');
    } catch(err) {
      console.log("Error", err);
      reject(err);
    }
  });
};
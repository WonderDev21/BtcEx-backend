const SparkPost = require('sparkpost');
const _ = require('lodash');
const request = require('request');
const Promise = require('bluebird');
const logger = require('winston');
const config = require('../config');
const client = new SparkPost(config.SPARKPOST_API_KEY);
const {verificationEmailOptions} = require('../constants/serverConstants');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const transporter = nodemailer.createTransport(smtpTransport({
      host: config.SMTP_CONFIG.HOST,
      port: config.SMTP_CONFIG.PORT,
      auth: config.SMTP_CONFIG.AUTH,
}));
exports.sendEmail = async (emailObj) => {
  logger.info(`Sending Email to ${emailObj.to}`);
  try {
    const response = await client.transmissions.send({
    content: {
      from: {
        name: emailObj.name || verificationEmailOptions.senderName,
        email: emailObj.from || verificationEmailOptions.senderEmail,
      },
      subject: emailObj.subject || 'Some error!',
      html: emailObj.html || '<html><body><p>Testing Email! Please contact at <a href="mailto:support@btcex.pro">support@btcex.pro</a> if you see this</p></body></html>'
    },
    recipients: [{address: emailObj.to || 'vk92kokil@gmail.com'}]
  });
    logger.info(`Email Sent Successfully to ${emailObj.to}`);
    return response;
  } catch(error) {
    logger.error(`Email Sending failed to ${emailObj.to}`, error);
    // return {message: `Some Error while sending email to ${emailObj.to}`, error: error};
  }
};
exports.sendMultipleEmail = async (emailObj) => {
  try {
    const recipients = emailObj.list && emailObj.list.map(x => ({address: x}));
    const response = await client.transmissions.send({
      content: {
        from: {
          name: emailObj.name || verificationEmailOptions.senderName,
          email: emailObj.from || verificationEmailOptions.senderEmail,
        },
        subject: emailObj.subject || 'Some error!',
        html: emailObj.html || '<html><body><p>Testing Email! Please contact at <a href="mailto:support@btcex.pro">support@btcex.pro</a> if you see this</p></body></html>'
      },
      recipients: recipients || [{address: emailObj.to || 'vk92kokil@gmail.com'}]
    });
    logger.info(`Multiple Email Sent Successfully to ${emailObj.list}`);
    return response;
  } catch(error) {
    logger.error(`Multiple Email Sending failed to ${emailObj.list}`, error);
    return error;
  }
};
exports.sendEmailZoho = async (emailObj) => {
  const options = {
    from: emailObj.from || 'no-reply@2bound.in',
    to: emailObj.to || 'kokil@coinmint.in',
    subject: emailObj.subject || 'No Subject',
    html: emailObj.html || 'Test Email',
  };
  try {
    const info = await transporter.sendMail(options);
    logger.info(`Email Sent Successfully to ${options.to} ${info.messageId}`, info.response);
    return info;
  } catch(err) {
    logger.info(`Email Sending failed to ${options.to}`, err);
    return err;
  }
};
exports.testEmailDeliverability = (email) => {
  return new Promise((resolve, reject) => {
    request(`https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${config.EMAIL_VERIFIER_HUNTER_KEY}`,
       function(error, resp, body) {
        if (resp && resp.statusCode === 200) {
          const json = JSON.parse(body);
          logger.info(`Email: ${email} verification response ${body}`);
          resolve({status: 200, data: _.get(json, 'data', {})});
        } else {
          logger.info(`Could not verify email: ${email} response ${body}`);
          resolve({message: 'Some Error while email verification', status: resp.statusCode});
        }
    });
  });
};

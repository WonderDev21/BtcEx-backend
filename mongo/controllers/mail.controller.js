const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const fs = require('fs');

exports.sendDailtyMail = async () => {
  // const fileStr = fs.readFileSync('');
  const transporter = nodemailer.createTransport(smtpTransport({
    host: 'smtp.zoho.com',
    port: 465,
    auth: {
      user: 'no-reply@2bound.in',
      pass: '12345678',
    },
  }));

  const mailOption = {
    from: 'no-reply@2bound.in',
    to: 'parag99799@mailinator.com',
    subject: 'Hello',
    // text: 'Hello Word',
    html: output,
  };

  transporter.sendMail(mailOption, (err, info) => {
    if (err) {
      response(err);
    }
    console.log('Message % sent: %s', info.messageId, info.response);
    response.status(200).send('Mail Send');
  });
};

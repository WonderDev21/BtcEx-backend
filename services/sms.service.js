const plivo = require('plivo');
const config = require('../config');
const logger = require('winston');
const moment = require('moment');
const sd = config.SENDER_PHONE_NO;
var p = plivo.RestAPI({
  authId: config.PLIVO.AUTH_ID,
  authToken: config.PLIVO.AUTH_TOKEN
});
/*
var params = {
    'src': '+918296842568', // Sender's phone number with country code
    'dst' : '+919599622943', // Receiver's phone Number with country code
    'text' : 'आपका OTP 123 فدےلت . સરસ', // Your SMS Text Message - English
};
// Prints the complete response
p.send_message(params, function (status, response) {
    console.log('Status: ', status);
    console.log('API Response:\n', response);
    console.log('Message UUID:\n', response['message_uuid']);
    console.log('Api ID:\n', response['api_id']);
});
*/
exports.sendLoginOTP = ({to, otp, expiryTime}) => {
  const params = {
    'src': config.PLIVO.SENDER_PHONE_NO,
    'dst' : to || '919599622943',
    'text' : `Use ${otp} as your login OTP. Do not share OTP for security reasons. This OTP is valid till ${expiryTime}.`,
  };
  return new Promise ((resolve, reject) => {
    p.send_message(params, (status, response) => {
      logger.info(` Status: ${status}\nAPI Response: ${JSON.stringify(response)}`);
      if(status >= 400) {
        reject(response);
      } else {
        resolve(response);
      }
    });
  });
};
exports.sendTxnOTP = ({to, otp, info, expiryTime}) => {
  const params = {
    'src': config.PLIVO.SENDER_PHONE_NO,
    'dst' : to || '919599622943',
    'text' : `Your OTP is ${otp} ${info}. Do not share OTP for security reasons. This OTP is valid till ${expiryTime}.`,
  };
  return new Promise ((resolve, reject) => {
    p.send_message(params, (status, response) => {
      logger.info(`Status: ${status}\nAPI Response: ${JSON.stringify(response)}`);
      if(status >= 400) {
        reject(response);
      } else {
        resolve(response);
      }
    });
  });
};
/*
var https = require('https');
var data = {
 api_key: '39d25fc4',
 api_secret: '318ea424b5368ddd',
 from: '441632960961',
 to: '',
 text: ''
};
function getOptions(data) {
  return {
    host: 'rest.nexmo.com',
    path: '/sms/json',
    port: 443,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(data))
    }
  };
};

exports.sendSMS = (smsReq) => {
  return new Promise((resolve, reject) => {
    data.to = smsReq.to;
    data.text = smsReq.text;
    var req = https.request(getOptions(data));
    req.write(JSON.stringify(data));
    req.end();
    var responseData = '';
    req.on('response', function(res){
      console.log('code: ', res.statusCode);
      res.on('data', function(chunk){
        responseData += chunk;
      });
      res.on('end', function(){
        console.log('SMS Response',JSON.parse(responseData));
        resolve(JSON.parse(responseData));
      });
    })
    .on('error', function(error){
      console.log('Reject',error);
      reject(error);
    });
  });
};
*/
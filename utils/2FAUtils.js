const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const Promise = require('bluebird');

const getQR = (otpAuthUrl) => {
  return new Promise((resolve, reject) => {
    QRCode.toDataURL(otpAuthUrl, function(err, imgData) {
      if(!err) {
        resolve(imgData);
      } else {
        reject(err);
      }
    });
  });
};

exports.gen2FA = async (user) => {
  const email = user.email;
  const secret = speakeasy.generateSecret({length: 20});
  const base32 = secret.base32; // store in DB
  const otpAuthUrl = speakeasy.otpauthURL({secret: secret.ascii, issuer: 'BtcEX', label: `${email}`, algorithm: 'sha512'});
  const qrImage = await getQR(otpAuthUrl);
  return {url: qrImage, base32: base32};
};

exports.verify2FA = (code, secret) => {
  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: code
  });
  return verified;
};

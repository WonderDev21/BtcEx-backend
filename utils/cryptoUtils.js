const crypto = require('crypto');
const {SHA_KEY} = require('../config');
const encryptor = require('simple-encryptor')({
  key: SHA_KEY,
  hmac: false,
});
exports.getHash = (text) => {
  const hash = crypto.createHmac('sha512', SHA_KEY);
  hash.update(text);
  const value = hash.digest('hex');
  return value;
};
exports.encrypt = (text) => {
  const encrypted = encryptor.encrypt(text);
  return encrypted;
};
exports.decrypt = (text) => {
  const decrypted = encryptor.decrypt(text);
  return decrypted;
};

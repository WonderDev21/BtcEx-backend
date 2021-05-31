const jwt = require('jsonwebtoken');
const _ = require('lodash');
const cryptoUtils = require('./cryptoUtils');
// const logger = require('winston');
const {JWT_SECRET_KEY} = require('../config');
const JWT_SECRET_HASH = cryptoUtils.getHash(JWT_SECRET_KEY);

const verifyJWTToken = (token) => {
  const decoded = jwt.verify(token, JWT_SECRET_HASH) || {};
  return decoded.payload;
};
const signJWTToken = (payload, expireTime = '3h') => {
  return jwt.sign({payload: payload}, JWT_SECRET_HASH, {expiresIn: expireTime});
};
exports.verifyToken = (token) => {
  const decoded = verifyJWTToken(token);
  const stringObj = cryptoUtils.decrypt(decoded);
  return JSON.parse(stringObj);
};
exports.signToken = (payload, expireTime = '3h') => {
  const encryptedObject = cryptoUtils.encrypt(JSON.stringify(payload));
  return signJWTToken(encryptedObject, expireTime);
};
exports.verifyJWTToken = verifyJWTToken;
exports.signJWTToken = signJWTToken;

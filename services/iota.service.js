const _ = require('lodash');
const logger = require('winston');
const crypto = require('crypto');
const anyBase = require('any-base');
const IOTA = require('iota.lib.js');
const randomWord = require('random-word');


const createSeed = (userId, length = 40) => {
  let text = '';
  const arr = [];
  for (let i=0; i < length;i++) {
    arr.push(randomWord());
  }
  text = arr.join('');
  const hash = crypto.createHmac('sha512', userId);
  hash.update(text);
  const value = hash.digest('hex');
  const base27Converter = anyBase(anyBase.HEX, '9ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  const seed = base27Converter(value);
  if (seed.length < 81) {
    logger.error('ERROR: SEED CREATED WITH LESS THAN 81 characters');
    createSeed(userId, length + 1);
  } else {
    return {key: 0, seed: seed.substr(0, 81), words: JSON.stringify(arr)};
  }
};
exports.regenerateSeed = (words = [], userId) => {
  const text = words.join('');
  const hash = crypto.createHmac('sha512', userId);
  hash.update(text);
  const value = hash.digest('hex');
  const base27Converter = anyBase(anyBase.HEX, '9ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  const seed = base27Converter(value);
  return {seed: seed.substr(0, 81), words: JSON.stringify(words)};
};
exports.getNewAddress = (seed, key = 0) => {
  const security = 2;
  const iota = new IOTA({});
  const address = iota.api._newAddress(seed, key, security, true);
  return address;
};
exports.createSeed = createSeed;

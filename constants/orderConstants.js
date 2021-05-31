const {CURRENCY} = require('../config');
exports.orderSide = {
  BUY  : 'BUY',
  SELL : 'SELL',
};
exports.currencyTypes = CURRENCY;
exports.orderStatus = {
  PENDING: 'PENDING',
  TRADED: 'TRADED',
  CANCELLED: 'CANCELLED',
};
exports.orderTypes = {
  IOC: 'IOC',
  GTC: 'GTC',
  FOK: 'FOK',
};


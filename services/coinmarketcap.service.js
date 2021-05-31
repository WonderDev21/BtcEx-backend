const Sequelize = require('sequelize');
const Order = require('../models').models.Order;
const Trade = require('../models').models.Trade;
const {arrayToJSON, objectToJSON} = require('../utils/jsonUtils');

// eslint-disable-next-line no-unused-vars
exports.getLatestPrice = async (currency, startTime, endTime) => {
  const where = {
    createdAt: {$lte : new Date()},
  };
  if (currency) {
    where.currency = currency;
  }

  const latestPrice = arrayToJSON(await Trade.findAll({
    attributes: [['price', 'last'], ['currency', 'target_currency']],
    where: where,
    order: [['createdAt','DESC']],
    limit: 1,
  }));
  return latestPrice[0] || {last: 0, target_currency: currency};
};

exports.getBidAndAsk = async (currency, startTime, endTime) => {
  const where = {
    createdAt: {$and: [{$gte : new Date(startTime)}, {$lte : new Date(endTime)}]},
    status: 'TRADED',
    side: 'BUY'
  };
  if (currency) {
    where.currency = currency;
  }

  const bids = arrayToJSON(await Order.findAll({
    attributes: [
      [Sequelize.fn('MAX', Sequelize.col('price')), 'highestBid'],
      ['currency', 'target_currency']
    ],
    where: where,
    group: ['currency']
  }));

  where.side = 'SELL';
  const asks = arrayToJSON(await Order.findAll({
    attributes: [
      [Sequelize.fn('MIN', Sequelize.col('price')), 'lowestAsk'],
      ['currency', 'target_currency']
    ],
    where: where,
    group: ['currency']
  }));
  return [...bids, ...asks];
};

exports.getHighAndLow = async (currency, startTime, endTime) => {
  const where = {
    createdAt: {$and: [{$gte : new Date(startTime)}, {$lte : new Date(endTime)}]},
  };
  if (currency) {
    where.currency = currency;
  }

  const highAndLow = arrayToJSON(await Trade.findAll({
    attributes: [
      [Sequelize.fn('MAX', Sequelize.col('price')), 'high24hr'],
      [Sequelize.fn('MIN', Sequelize.col('price')), 'low24hr'],
      ['currency', 'target_currency'],
    ],
    where: where,
    group: ['currency']
  }));
  return highAndLow;
};

exports.getSellerVolume = async (currency, startTime, endTime) => {
  const where = {
    createdAt: {$and: [{$gte : new Date(startTime)}, {$lte : new Date(endTime)}]},
    side: 'SELL',
    status: 'TRADED',
  };
  if (currency) {
    where.currency = currency;
  }
  const orderIds = arrayToJSON(await Order.findAll({
    attributes: ['orderId'],
    where: where
  }));

  const sellerVolume = arrayToJSON(await Trade.findAll({
    includeIgnoreAttributes: false,
    attributes: [
      [Sequelize.fn('SUM', Sequelize.col('size')), 'base_volume'],
      ['currency', 'target_currency'],
    ],
    where: {
      sellOrderId: {
        $in: orderIds.map(order => order.orderId)
      },
    },
    group: ['currency']
  }));
  return sellerVolume;
};

exports.getBuyerVolume = async (currency, startTime, endTime) => {
  const where = {
    createdAt: {$and: [{$gte : new Date(startTime)}, {$lte : new Date(endTime)}]},
    side: 'BUY',
    status: 'TRADED',
  };
  if (currency) {
    where.currency = currency;
  }
  const orderIds = arrayToJSON(await Order.findAll({
    attributes: ['orderId'],
    where: where
  }));

  const buyerVolume = arrayToJSON(await Trade.findAll({
    includeIgnoreAttributes: false,
    attributes: [
      [Sequelize.fn('SUM', Sequelize.col('size')), 'quote_volume'],
      ['currency', 'target_currency'],
    ],
    where: {
      buyOrderId: {
        $in: orderIds.map(order => order.orderId)
      },
    },
    group: ['currency']
  }));
  return buyerVolume;
};

exports.getTrades = async (target_currency, limit, type, start_time, end_time) => {
  const where = {};
  if (target_currency) {
    where.currency = target_currency;
  }
  if (type) {
    where.side = type;
  }
  if (start_time) {
    where.createdAt = {
      $and: [{$gte : new Date(start_time)}],
    };
  }
  if (end_time) {
    where.createdAt = {
      $and: [{$lte: new Date(end_time)}],
    };
  }
  const trades = arrayToJSON(await Trade.findAll({
    includeIgnoreAttributes: true,
    include: [{
      model: Order,
      as: 'buyTrade',
      attributes: [['side', 'type']],
      where: {
        currency: target_currency,
      }
    }],
    attributes: [['refId', 'trade_id'], 'price', ['size', 'quote_volume'], ['createdAt', 'timestamp']],
    where: where,
    limit: limit
  }));
  return trades;
};

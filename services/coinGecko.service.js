const Sequelize = require('sequelize');
const moment = require('moment');
const Order = require('../models').models.Order;
const Trade = require('../models').models.Trade;
const channel = require('../setup/channel.js');
const {channelNames} = require('../constants/channelConstants');
const {arrayToJSON, objectToJSON} = require('../utils/jsonUtils');
const { orderStatus } = require('../constants/orderConstants');

exports.getLatestPrice = async (currency, startTime, endTime) => {
  const where = {
    createdAt: {$and: [{$gte : new Date(startTime)}, {$lte : new Date(endTime)}]},
    status: 'PENDING'
  };
  if (currency) {
    where.currency = currency;
  }

  const latestPrice = arrayToJSON(await Order.findAll({
    attributes: [['price', 'last_price'], ['currency', 'target_currency']],
    where: where,
    order: [['createdAt','DESC']],
  }));
  return latestPrice;
};

exports.getBidAndAsk = async (currency, startTime, endTime) => {
  const where = {
    createdAt: {$and: [{$gte : new Date(startTime)}, {$lte : new Date(endTime)}]},
    status: 'PENDING',
    side: 'BUY'
  };
  if (currency) {
    where.currency = currency;
  }

  const bids = arrayToJSON(await Order.findAll({
    attributes: [
      [Sequelize.fn('MAX', Sequelize.col('price')), 'bid'],
      ['currency', 'target_currency']
    ],
    where: where,
    group: ['currency']
  }));

  where.side = 'SELL';
  const asks = arrayToJSON(await Order.findAll({
    attributes: [
      [Sequelize.fn('MIN', Sequelize.col('price')), 'ask'],
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
      [Sequelize.fn('MAX', Sequelize.col('price')), 'high'],
      [Sequelize.fn('MIN', Sequelize.col('price')), 'low'],
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
      [Sequelize.fn('SUM', Sequelize.col('size')), 'target_volume'],
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

exports.getBids = async (targetCurrency, depth) => {
  const bids = arrayToJSON(await Order.findAll({
    attributes: ['price', 'currentSize', 'filledSize'],
    where: {
      currency: targetCurrency,
      side: 'BUY',
      status: orderStatus.PENDING,
    },
    limit: depth,
  }));
  return bids;
};

exports.getAsks = async (targetCurrency, depth) => {
  const asks = arrayToJSON(await Order.findAll({
    attributes: ['price', 'currentSize', 'filledSize'],
    where: {
      currency: targetCurrency,
      side: 'SELL',
      status: orderStatus.PENDING,
    },
    limit: depth,
  }));
  return asks;
};

exports.getBuyTradeHistory = async (target_currency, limit, type, start_time, end_time) => {
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
  const buyHistory = arrayToJSON(await Trade.findAll({
    includeIgnoreAttributes: true,
    include: [{
      model: Order,
      as: 'buyTrade',
      attributes: [['side', 'type']],
      where: {
        currency: target_currency,
        side: 'BUY'
      }
    }],
    attributes: [['refId', 'trade_id'], 'price', ['size', 'target_volume'], ['createdAt', 'trade_timestamp']],
    where: where,
    limit: limit
  }));
  return buyHistory;
};

exports.getSellTradeHistory = async (target_currency, limit, type, start_time, end_time) => {
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
  const sellHistory = arrayToJSON(await Trade.findAll({
    includeIgnoreAttributes: true,
    include: [{
      model: Order,
      as: 'sellTrade',
      attributes: [['side', 'type']],
      where: {
        currency: target_currency,
        side: 'SELL'
      }
    }],
    attributes: [['refId', 'trade_id'], 'price', ['size', 'target_volume'], ['createdAt', 'trade_timestamp']],
    where: where,
    limit: limit
  }));
  return sellHistory;
};

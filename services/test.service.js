const Order = require('../models').models.Order;
const accountService = require('./account.service');
const levelService = require('./level.service');

const sequelize = require('../models');
const Sequelize = require('sequelize');

const Promise = require('bluebird');
const _ = require('lodash');
const numeral = require('numeral');
const logger = require('winston');

const {arrayToJSON, objectToJSON} = require('../utils/jsonUtils');
const {baseCurrency} = require('../config');
const orderUtils = require('../utils/order.utils');
const {orderStatus, orderTypes, orderSide} = require('../constants/orderConstants');

exports.placeOrder = async (order) => {
  return sequelize.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE})
  .then(async (t) => {
    try {
      const amountToBeTransferred = await orderUtils.calculateUserAmount(order.price, order.currentSize, order.side, 'DEBIT');
      const accountResponse = await accountService.transferToServer(order.userId, order.side, order.currency, amountToBeTransferred, t);
      if(accountResponse.status == 200) {
        const newLevel = await levelService.addLevel(order, t);
        const createdOrder = await Order.create({
          side: order.side,
          price: order.price,
          currentSize: order.currentSize,
          filledSize: order.filledSize,
          type: order.type,
          userId: order.userId,
          currency: order.currency,
          levelId: newLevel.levelId
        },{transaction: t});
        t.commit();
        logger.info(`Order Placed sucessfully: OrderID: ${createdOrder.orderId}`);
        return({status: 200, createdOrder: objectToJSON(createdOrder), createdLevel: objectToJSON(newLevel)});
      }
      return {status: 400, data: accountResponse};
    } catch(error){
      t.rollback();
      logger.info('Rollback: ', error);
      return {status: 400, message: 'Error occured in Place Order', error: error};
    }
  }).catch((error) => {
    t.rollback();
    logger.info('Error Place Order: ', error);
    return(error);
  });
};

exports.startTrading = async (createdOrder, createdLevel) => {
  return sequelize.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE})
  .then(async (t) => {
  try {
    const ordersForTrading = await levelService.findOrdersForTrading(createdOrder);
    let tradingResponse = null;
    let updateResponse = null;

    if(ordersForTrading.length){
      logger.info('Get Orders For Trading');
      tradingResponse = await orderUtils.doTrading(ordersForTrading, createdOrder, createdLevel);
      const updateResponse = await Promise.all([
        updateTradedOrdersAndLevel(tradingResponse, t),
        updateTradeUserAccount(tradingResponse.data.tradedOrdersDetails, t)
      ]);
      logger.info('Orders, Levels and User Account Update Sucessfully: ');
      t.commit();
      return {ordersForTrading, tradingResponse: tradingResponse.data.tradedOrdersDetails,};
    }

    logger.info('No Order Match for Trading: ');
    t.commit();
    return {ordersForTrading};
  } catch(error) {
    t.rollback();
    logger.info(`Error: ${error}`);
    return error;
  }
}).catch((error) => {
    t.rollback();
    logger.info('Error in Start Tading: ', error);
    return(error);
  });
};

const updateTradeUserAccount = async (tradedOrdersDetails, t=null) => {
  const userINRObject = {};
  const userCurrencyObject = {};

  _.forEach(tradedOrdersDetails, (tradeObject) => {
    userINRObject[tradeObject.sellUserId] = userINRObject[tradeObject.sellUserId]
      ? {amount: numeral(userINRObject[tradeObject.sellUserId].amount).add(tradeObject.transferBaseCurrency).value(), currency: baseCurrency}
      : {amount: tradeObject.transferBaseCurrency, currency: baseCurrency};

    userCurrencyObject[tradeObject.buyUserId] = userCurrencyObject[tradeObject.buyUserId]
      ? {amount: numeral(userCurrencyObject[tradeObject.buyUserId].amount).add(tradeObject.tradeSize).value(), currency:tradeObject.currency}
      : {amount: tradeObject.tradeSize, currency:tradeObject.currency};
  });
  return await Promise.all([transferToUsers(userINRObject, t), transferToUsers(userCurrencyObject, t)]);
};

const updateTradedOrdersAndLevel = async (tradingResponse, t=null) => {
  const {ordersForTrade, createdOrder, createdLevel, tradedOrdersDetails} = tradingResponse.data;
  let orderUpdatePromise = [];
  let levelUpdatePromise = [];
  _.forEach(ordersForTrade, (levels) => {
    const orders = levels.orders;
    const levelObject = _.omit(levels, 'orders');
    if(levelObject.update){
      levelUpdatePromise.push(levelService.updateLevel(levelObject.levelId, levelObject, t));
    }
    _.forEach(orders, (orderObject) => {
      if(orderObject.update) {
        orderUpdatePromise.push(updateOrder(orderObject.orderId, orderObject, t));
      }
    });
  });
  orderUpdatePromise.push(updateOrder(createdOrder.orderId, createdOrder, t));
  levelUpdatePromise.push(levelService.updateLevel(createdLevel.levelId, createdLevel, t));
  return await Promise.all(levelUpdatePromise, orderUpdatePromise);
};

const updateOrder = async (orderId, data, t=null) => {
  const order = await Order.update(data,{
    where:{orderId: orderId},
    transaction: t,
    returning: true,
    plain: true
  });
  return objectToJSON(order[1]);
};
const transferToUsers = async (userINRObject, t) => {
  let promise = Promise.resolve();
  const userIds = Object.keys(userINRObject);
  for (let userId in userIds) {
    const amount = userINRObject[userId].amount;
    const currency = userINRObject[userId].currency;
    const resp = await accountService.transferFromServer(userId, currency, amount, t);
    logger.info('Server amount transferred');
  }
  /*
  Object.keys(userINRObject).forEach((userId) => {
    const amount = userINRObject[userId].amount;
    const currency = userINRObject[userId].currency;
    // console.log('Creating Trasfer Promise: ', userId, 'Currency: ', currency, 'Amount: ', amount);
    promise = promise.then(() => accountService.transferFromServer(userId, currency, amount, t));
  });
  await promise;
  */
  return {status: 200, message: 'Sucessfully Trasnfered'};
};

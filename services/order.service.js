var Promise = require('bluebird');
const Sequelize = require('sequelize');
const numeral = require('numeral');
const logger = require('winston');
const Order = require('../models').models.Order;
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const emailService = require('./email.service');
const accountService = require('./account.service');
const userService = require('./user.service');
const levelService = require('./level.service');
const tradeService = require('./trade.service');
const sequelize = require('../models');
const orderUtils = require('../utils/order.utils');
const {arrayToJSON, objectToJSON} = require('../utils/jsonUtils');
const {verificationEmailOptions} = require('../constants/serverConstants');
const {currencyTypes, orderStatus, orderTypes, orderSide} = require('../constants/orderConstants');

const {NotificationTypes} = require('../constants/notificationConstants');
const {MessageTypes} = require('../constants/slackConstants.js');
const {baseCurrency, GSTIN, APP_URL, APP_NAME, SUPPORT_EMAIL} = require('../config');
const sendAdminNotification = require('../deployments/postMessage.js');
const channel = require('../setup/channel.js');
const {channelNames} = require('../constants/channelConstants');
const globalQueue = channel.getChannel(channelNames.TRADE);


exports.getAllOrdersAdmin = async () => arrayToJSON(await Order.findAll({order: [['updatedAt', 'DESC']]}));
exports.getAllOrders = async (t) => arrayToJSON(await Order.findAll({where: {status: orderStatus.PENDING}, transaction: t}));

exports.getOrdersForRestartTrading = async (startPrice, endPrice, side) => arrayToJSON(await Order.findAll({
  where: {
    $and:[
      {status: orderStatus.PENDING},
      {price: {$lte: endPrice}},
      {price: {$gte: startPrice}},
  ]},
  order: [['createdAt','ASC']],
}));

exports.getAllOrdersBySide = async (side) => arrayToJSON(await Order.findAll({
  where: {
    status: orderStatus.PENDING,
    side: side
  }
}));

exports.getCurrencyOrder = async (currency = currencyTypes.ETH) => {
  const buyOrders = await Order.findAll({attributes: ['price', [Sequelize.fn('SUM', Sequelize.col('currentSize')), 'totalSize']],
    where: {side:  orderSide.BUY, status: orderStatus.PENDING, type: orderTypes.GTC, currency: currency, currentSize: {$gte: 0}},
    order: [['price', 'DESC']],
    limit: 10, group: 'price'});
  const sellOrders = await Order.findAll({attributes: ['price', [Sequelize.fn('SUM', Sequelize.col('currentSize')), 'totalSize']],
    where: {side:  orderSide.SELL, status: orderStatus.PENDING, type: orderTypes.GTC, currency: currency, currentSize: {$gte: 0}},
    order: [['price', 'ASC']],
    limit: 10, group: 'price'});
  buyOrders.forEach(b => b.currency = currency);
  sellOrders.forEach(s => s.currency = currency);
  return {buyOrders, sellOrders};
};

exports.getUserPendingOrders = async (userId, currency = currencyTypes.ETH) => arrayToJSON(await Order.findAll({where: {userId: userId, status: orderStatus.PENDING, currency: currency}}));

exports.getOrdersByUserId = async (userId, offset) => {
  if(offset && typeof (offset) === 'number') {
    return arrayToJSON(await Order.findAll({where: {userId: userId}, order: [['createdAt', 'DESC']], offset: offset, limit: 10}));
  }
  if (offset && typeof (offset) === 'string') {
    return arrayToJSON(await Order.findAll({where: {userId: userId}, order: [['createdAt', 'DESC']], currency: offset}));
  }
  return arrayToJSON(await Order.findAll({where: {userId: userId}, order: [['createdAt', 'DESC']]}));
};

exports.getorderByOrderId = async (orderId) => {
  return objectToJSON(await Order.find({where: {orderId: orderId}}));
};
exports.getCurrencyBestSellers = async () => {
  logger.info('Getting bestseller by currencies:');
  const getSeller = async (currency) => {
    const seller = await Order.findAll({
      attributes: ['price', 'currency'],
      where: {
        side: 'SELL',
        currency: currency,
        status: orderStatus.PENDING,
      },
      limit: 1,
      order: [['price','ASC'], ['createdAt','ASC']],
    });
    return arrayToJSON(seller)[0];
  };
  const currencies = Object.keys(currencyTypes);
  const pArr = [];
  currencies.forEach(async currency => {
    pArr.push(getSeller(currency));
  });
  const prices = await Promise.all(pArr);
  const priceObj = {};
  _.forEach(prices, x => {
    if (x) {
      priceObj[x.currency] = {price: parseFloat(x.price)};
    }
  });
  priceObj[baseCurrency] = {price: 1};
  return priceObj;
};
exports.getBestBuyer = async (currency) => {
  logger.info(`Getting bestbuyer by currency: ${currency}`);
  const buyer = await Order.findAll({
    where: {
      currency: currency,
    },
    limit: 1,
    order: [['price','DESC'], ['createdAt','ASC']],
  });
  return arrayToJSON(buyer)[0];
};
/*
exports.getBestSeller = async (currency, startTime, endTime) => {
  logger.info(`Getting bestseller by currency: ${currency}, startTime: ${startTime}, endTime: ${endTime}`);
  const seller = await Order.findAll({
    where: {
      createdAt: { $and: [ { $gte : new Date(startTime) }, { $lte : new Date(endTime)}] },
      currency: currency,
      // status: 'PENDING',
    },
    order: [['price','ASC'],['createdAt','ASC']],
  });
  return seller[0].toJSON();
}

exports.getBestBuyer = async (currency, startTime, endTime) => {
  const buyer = await Order.findAll({
    where: {
      createdAt: { $and: [ { $gte : new Date(startTime) }, { $lte : new Date(endTime)}] },
      currency: currency,
      // status: 'PENDING',
    },
    order: [['price','DESC'],['createdAt','ASC']],
  });
  return buyer[0].toJSON();
}
*/

exports.sellerVol = async (currency, startTime, endTime) => {
  const volume = await Order.findAndCountAll({
    where: {
      createdAt: {$and: [{$gte : new Date(startTime)}, {$lte : new Date(endTime)}]},
      currency: currency,
      side: 'SELL'
      // status: 'PENDING',
    },
  });
  return volume;
};

exports.buyerVol = async (currency, startTime, endTime) => {
  const volume = await Order.findAndCountAll({
    where: {
      createdAt: {$and: [{$gte : new Date(startTime)}, {$lte : new Date(endTime)}]},
      currency: currency,
      side: 'BUY'
      // status: 'PENDING',
    },
  });
  return volume;
};

const sendMailForTradeOrder = async (tradeArray) => {
  //
  try {
    const tradedOrderMail = fs.readFileSync(path.join(process.cwd(), 'mailer/output/orderTraded.html'));
    const compiled = _.template(tradedOrderMail);
    _.forEach(tradeArray, async (tradeObject) => {
      const {buyerFee, sellerFee, price, size, currency, buyUserId, sellUserId, createdAt} = tradeObject;
      const buyer = await userService.getUserById(buyUserId);
      const seller = await userService.getUserById(sellUserId);
      logger.info('Trade Email objects: ', {tradeObject, buyer: buyer.email, seller: seller.email});
      const orderAmount = numeral(price).multiply(size).value();
      const buyerOutput = compiled({
        APP_URL,
        APP_NAME,
        SUPPORT_EMAIL,
        fullName: buyer.fullName,
        ORDER_TYPE: 'BUY',
        TRADE_QUANTITY: size,
        CURRENCY: currency,
        TRADE_AMOUNT: price,
        TRADE_TIME: moment(createdAt).format('lll'),
        ORDER_COMMISSION: `${numeral(buyerFee).value()}`,
        TOTAL_AMOUNT: `${orderAmount} ${baseCurrency}`,
        CREDIT_AMOUNT: `${size} ${currency}`,
        GSTIN: GSTIN || '',
      });
      const buyerEmailObject = {
        from: verificationEmailOptions.senderEmail,
        to: buyer.email,
        subject: 'Order Traded',
        html: buyerOutput,
      };
      const sellerOutput = compiled({
        APP_URL,
        APP_NAME,
        SUPPORT_EMAIL,
        fullName: seller.fullName,
        ORDER_TYPE: 'SELL',
        TRADE_QUANTITY: size,
        CURRENCY: currency,
        TRADE_AMOUNT: price,
        TRADE_TIME: moment(createdAt).format('lll'),
        ORDER_COMMISSION: `${numeral(sellerFee).value()}`,
        TOTAL_AMOUNT: `${orderAmount} ${baseCurrency}`,
        CREDIT_AMOUNT: `${numeral(orderAmount).subtract(sellerFee).value()} ${baseCurrency}`,
        GSTIN: GSTIN || '',
      });
      const sellerEmailObject = {
        from: verificationEmailOptions.senderEmail,
        to: seller.email,
        subject: 'Order Traded',
        html: sellerOutput,
      };
      sendAdminNotification(MessageTypes.ORDER_TRADED, {currency: currency, commission: 'B: '+buyerFee+' S:'+sellerFee, amount: price, size: size});
      emailService.sendEmail(buyerEmailObject);
      emailService.sendEmail(sellerEmailObject);
    });
  } catch(err2) {
    logger.info('Error while sending traded email', err2);
  }
};
exports.examineOrder = (order) => {
  // TODO check order price, if order type is seller & selling price < top buyer  then don't allow.
};
exports.placeOrder = async (order) => {
  return sequelize.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE})
  .then(async (t) => {
    try {
      const amountToBeTransferred = orderUtils.calculateUserAmount(order.price, order.currentSize, order.side, 'DEBIT');
      const options = {remarks: 'New Order'};
      const accountResponse = await accountService.transferToServer(order.userId, order.side, order.currency, amountToBeTransferred, t, options);
      if(accountResponse.status === 200) {
        const newLevel = await levelService.addLevel(order, t);
        const createdOrder = await Order.create({
          side: order.side,
          price: order.price,
          currentSize: order.currentSize,
          type: order.type,
          userId: order.userId,
          currency: order.currency,
          levelId: newLevel.levelId
        },{transaction: t});
        logger.info(`Order Placed sucessfully: OrderID: ${createdOrder.orderId}`);
        await t.commit();
        // globalQueue.sendUserAccountNotification(accountResponse.data);
        const notificationObject = {currency: createdOrder.currency, price: createdOrder.price, side: createdOrder.side, userId: createdOrder.userId};
        globalQueue.sendOrderNotification(notificationObject);
        const user = await userService.getUserById(order.userId);
        const createdOrderMail = fs.readFileSync(path.join(process.cwd(), 'mailer/output/orderPlaced.html'));
        const compiled = _.template(createdOrderMail);
        const output = compiled({
          APP_URL,
          APP_NAME,
          SUPPORT_EMAIL,
          ORDER_TYPE: order.side,
          QUANTITY: order.currentSize,
          CURRENCY: order.currency,
          ORDER_AMOUNT: order.price, // rate
          ORDER_PLACED_TIME: moment(order.createdAt).format('lll'),
          ORDER_COMMISSION: `${order.side === 'BUY' ? numeral(amountToBeTransferred).subtract(numeral(order.price).multiply(order.currentSize).value()).value() : 0}`,
          TOTAL_AMOUNT: `${amountToBeTransferred} ${order.side === 'BUY' ? baseCurrency : order.currency}`,
        });
        const emailObject = {
          from: verificationEmailOptions.senderEmail,
          to: user.email,
          subject: 'Order Placed',
          html: output,
        };
        sendAdminNotification(MessageTypes.NEW_ORDER_PLACED, {type: createdOrder.side, amount: `${createdOrder.price}_per_${createdOrder.currency}`, size: `${createdOrder.currentSize}`, email: user.email});
        emailService.sendEmail(emailObject);
        return({
          status: 200,
          createdOrder: objectToJSON(createdOrder),
          createdLevel: objectToJSON(newLevel),
          accountResponse: accountResponse.data,
        });
      } else {
        t.rollback();
        return {status: 400, data: accountResponse};
      }
    } catch(error) {
      t.rollback();
      logger.info('Rollback: ', error);
      return {status: 400, message: 'Error occured in Place Order', error: error};
    }
  });
};

exports.startTrading = async (createdOrder, createdLevel) => {
  return sequelize.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE})
  .then(async (t) => {
  try {
    const ordersForTrading = await levelService.findOrdersForTrading(createdOrder, t);
    let tradingResponse = null;
    let updateResponse = null;

    if(ordersForTrading && ordersForTrading.length) {
      logger.info('Get Orders For Trading');
      tradingResponse = await orderUtils.doTrading(ordersForTrading, createdOrder, createdLevel);
      const updateResponse = await Promise.all([
        updateTradedOrdersAndLevel(tradingResponse, t),
        updateTradeUserAccount(tradingResponse.data.tradedOrdersDetails, t),
        createTrade(tradingResponse.data.tradedOrdersDetails, t),
      ]);
      logger.info('Orders, Levels and User Account Update Sucessfully: ');
      await t.commit();
      const updatedAccouts = _.flattenDeep([...updateResponse[1][0], ...updateResponse[1][1]]);
      // globalQueue.sendUserAccountNotification(updatedAccouts);
      globalQueue.sendNewTradeNotification(updateResponse[2]);
      try {
        sendMailForTradeOrder(updateResponse[2]);
      } catch (err2) {
        logger.error('Error while sending trade email', err2);
      }
      return {ordersForTrading, tradingResponse: tradingResponse.data.tradedOrdersDetails,};
    } else {
      logger.info('No Order Match for Trading: ');
      await t.commit();
      return {ordersForTrading};
    }
  } catch(error) {
    t.rollback();
    logger.error('PRIORITY-0 Error:', error);
    return error;
  }
}).catch((error) => {
    t.rollback();
    logger.error('PRIORITY-0 Error in Start Tading: ', error);
    return(error);
  });
};

const createTrade = async (tradedOrdersDetails, t=null) => {
  const tradePromise = [];

  _.forEach(tradedOrdersDetails , (tradeObject) => {
    tradePromise.push(tradeService.addNewTrade(tradeObject, t));
  });

  return await Promise.all(tradePromise);
};

const updateTradeUserAccount = async (tradedOrdersDetails, t=null) => {
  const userBaseWalletObject = {};
  const userCurrencyObject = {};

  _.forEach(tradedOrdersDetails, (tradeObject) => {
    userBaseWalletObject[tradeObject.sellUserId] = userBaseWalletObject[tradeObject.sellUserId]
      ? {amount: numeral(userBaseWalletObject[tradeObject.sellUserId].amount).add(tradeObject.transferBaseCurrency).value(), currency: baseCurrency}
      : {amount: tradeObject.transferBaseCurrency, currency: baseCurrency};

    userCurrencyObject[tradeObject.buyUserId] = userCurrencyObject[tradeObject.buyUserId]
      ? {amount: numeral(userCurrencyObject[tradeObject.buyUserId].amount).add(tradeObject.tradeSize).value(), currency:tradeObject.currency}
      : {amount: tradeObject.tradeSize, currency:tradeObject.currency};

    if(tradeObject.returnAmount>0){
      userBaseWalletObject[tradeObject.buyUserId] = userBaseWalletObject[tradeObject.buyUserId]
      ? {amount: numeral(userBaseWalletObject[tradeObject.buyUserId].amount).add(tradeObject.returnAmount).value(), currency: baseCurrency}
      : {amount: tradeObject.returnAmount, currency: baseCurrency};
    }

  });
  return await Promise.all([transferToUsers(userBaseWalletObject, t), transferToUsers(userCurrencyObject, t)]);
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

  return await Promise.all([
    ...levelUpdatePromise,
    ...orderUpdatePromise
  ]);
};

const updateOrder = async (orderId, data, t=null) => {
  const order = await Order.update(data, {
    where: {orderId: orderId},
    transaction: t,
    lock: t.LOCK.UPDATE,
    returning: true,
    plain: true
  });
  return objectToJSON(order[1]);
};
exports.updateOrder = updateOrder;

const transferToUsers = async (userObject, t) => {
  let responseData = [];
  const userIds = Object.keys(userObject);
  for (let userId of userIds) {
    const amount = userObject[userId].amount;
    const currency = userObject[userId].currency;
    const options = {remarks: 'Order Traded'};
    const resp = await accountService.transferFromServer(userId, currency, amount, t, options);
    if(resp.status === 200) {
      responseData.push(resp.data);
    } else {
      logger.info('Error: ', resp.message);
    }
  }
  return responseData;
};

exports.cancelOrder = async (orderId) => {
  logger.info(`Cancel Order: ${orderId}`);

    return sequelize.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE})
    .then(async (t) => {
      try {
        const order = await Order.find({
          where: {orderId: orderId, status: 'PENDING'},
          transaction: t,
          lock: t.LOCK.UPDATE
        });
        logger.info('Cancelling order', order && order.toJSON());
        if (order) {
          const orderJson = objectToJSON(order);
          const returnAmount = orderUtils.calculateUserAmount(orderJson.price, orderJson.currentSize, orderJson.side, 'DEBIT');
          const currencyType = orderJson.side === 'BUY' ? baseCurrency : orderJson.currency;
          const options = {remarks: 'Cancel Order', refId: orderId};
          const cancelResponse = await Promise.all([
            updateOrder(orderJson.orderId, {status: 'CANCELLED'}, t),
            // order.updateAttributes({status: 'CANCELLED'}, t),
            levelService.decrementSizeAndQty(orderJson.levelId, orderJson.currentSize, 1, t),
            accountService.transferFromServer(orderJson.userId, currencyType, returnAmount, t, options)
          ]);
          logger.info('Cancel order success', cancelResponse[0]);
          await t.commit();
          globalQueue.sendCancelledOrderNotification(cancelResponse[0]);
          try {
            const amountToBeTransferred = orderUtils.calculateUserAmount(orderJson.price, orderJson.currentSize, orderJson.side, 'DEBIT');
            const user = await userService.getUserById(orderJson.userId);
            const cancelOrderMail = fs.readFileSync(path.join(process.cwd(), 'mailer/output/cancelOrder.html'));
            const compiled = _.template(cancelOrderMail);
            const output = compiled({
              APP_URL,
              APP_NAME,
              SUPPORT_EMAIL,
              ORDER_TYPE: orderJson.side,
              QUANTITY: orderJson.currentSize,
              CURRENCY: orderJson.currency,
              ORDER_AMOUNT: orderJson.price,
              ORDER_CANCEL_TIME: moment(orderJson.updatedAt).format('lll'),
              ORDER_COMMISSION: `${orderJson.side === 'BUY' ? numeral(amountToBeTransferred).subtract(numeral(orderJson.price).multiply(orderJson.currentSize).value()).value() : 0}`,
              TOTAL_AMOUNT: `${amountToBeTransferred} ${orderJson.side === 'BUY' ? baseCurrency : orderJson.currency}`,
            });
            const emailObject = {
              from: verificationEmailOptions.senderEmail,
              to: user.email,
              subject: 'Order Cancelled',
              html: output,
            };
            sendAdminNotification(MessageTypes.ORDER_CANCELLED, {type: orderJson.side, amount: `${orderJson.price}_per_${orderJson.currency}`, size: orderJson.currentSize, email: user.email});
            emailService.sendEmail(emailObject);
            return {status: 200, body: cancelResponse[0]};
          } catch(err2) {
            logger.info('Some Error in cancel Order', err2);
            return {status: 400, error: err2, message: 'Some error in cancel order'};
          }
        } else {
          await t.commit();
          // globalQueue.sendCancelledOrderNotification(objectToJSON(cancelResponse[0])); cant' find order to cancel.
          return {status: 400, body: {message: "Can't find any pending order"}};
        }
      } catch(err) {
        t.rollback();
        logger.info('Error: ', err);
        return {status: 400, body: {message: 'Error while order cancel. Please retry again !'}};
      }
    });
};

exports.restart = async (startPrice = 0, endPrice= 100, side = 'BUY') => {
  const {spawn} = require('child_process');
  const cp = spawn('node', ['./services/startTrading.service.js', startPrice, endPrice, side], {
    detached: true,
  });
  cp.stdout.pipe(process.stdout);
  process.on('SIGQUIT', () => {
    console.log('Killing process');
    cp.kill();
  });
  logger.info();
};

exports.restartTrading = async (allOrders) => {
  for(var i=0;i<allOrders.length;i++) {
    logger.info('Restart Trading for OrderId: ',allOrders[i].orderId );
    await exports.restartTradingForOrder(allOrders[i]);
  }
  logger.info('All Orders restart Completed: ');
};

exports.restartTradingForOrder = async (orderDetails) => {
  const levelDetail = await levelService.getLevelById(orderDetails.levelId);
  const tradingResponse = await exports.startTrading(orderDetails, levelDetail);
  return 'DONE';
};

exports.getBestSellerPrice = async (currency, startTime, endTime) => {
  const seller = await Order.findAll({
    where: {
      createdAt: {$and: [{$gte : new Date(startTime)}, {$lte : new Date(endTime)}]},
      currency: currency,
    },
    order: [['price','DESC'],['createdAt','ASC']],
    limit: 1,
  });
  return seller.length ? arrayToJSON(seller)[0] : {};
};

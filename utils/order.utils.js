const {SUPPORTED_CURRENCY, fees, baseCurrency} = require('../config'); // get from config.
const _ = require('lodash');
const numeral = require('numeral');
const logger = require('winston');

exports.doTrading = async (ordersForTrade = [], createdOrder, createdLevel) => {
  let levelVar=0;
  let tradedOrdersDetails = [];
  // trade matcher.
  return {data: {ordersForTrade, createdOrder, createdLevel , tradedOrdersDetails}};
};


exports.calculateUserAmount = (price, currentSize, side, type) => {
  if(type === 'DEBIT') {
    if(side === 'BUY') {
      const totalAmount = numeral(price).multiply(currentSize).value();
      const costAppliedOnBaseCurrency = numeral(totalAmount).multiply(fees.buyerFee).divide(100).value();
      const userAmount = numeral(totalAmount).add(costAppliedOnBaseCurrency).value();
      return userAmount;
    } else {
      return numeral(currentSize).value();
    }
  } else {
    if(side === 'SELL') {
      const totalAmount = numeral(price).multiply(currentSize).value();
      const costAppliedOnBaseCurrency = numeral(totalAmount).multiply(fees.sellerFee).divide(100).value();
      const userAmount = numeral(totalAmount).subtract(costAppliedOnBaseCurrency).value();
      return userAmount;
    } else {
      return numeral(currentSize).value();
    }
  }
};

exports.calculateReturnAmount = (price, tradePrice, tradeSize) => {
  const debitAmount = numeral(price).multiply(tradeSize).value();
  const costAppliedOnDebitAmount = numeral(debitAmount).multiply(fees.buyerFee).divide(100).value();
  const debitedTotalAmount = numeral(debitAmount).add(costAppliedOnDebitAmount).value();

  const tradeAmount = numeral(tradePrice).multiply(tradeSize).value();
  const costAppliedOnTradeAmount = numeral(tradeAmount).multiply(fees.buyerFee).divide(100).value();
  const tradeTotalAmount = numeral(tradeAmount).add(costAppliedOnTradeAmount).value();
  const returnAmount = numeral(debitedTotalAmount).subtract(tradeTotalAmount).value();
  if (returnAmount < 0) {
    logger.error('PRIORITY-0 Trying to return negative amount', price, tradeSize, tradePrice, tradeSize);
  }
  logger.info('Buyer Return Amount: ', returnAmount);
  const isSafeAmount = returnAmount >= 0;
  return isSafeAmount ? returnAmount : 0;
};
/*
exports.getOrderForTrade = (allOrders = [], order) => { // previous logic for trade NOT USED NOW
const orderLength = allOrders.length;
const updateorders = [];
let updateLevel = [];
let orderSize = order.currentSize;
let totalSize = 0;
  for(let i=0; i < orderLength; i++) {
    const eachOrder = allOrders[i];
    if(eachOrder.currentSize <= orderSize){
        // console.log('Order size If..', orderSize);
        totalSize = numeral(totalSize).add(eachOrder.currentSize).value();
        orderSize = numeral(orderSize).subtract(eachOrder.currentSize).value();
        const updateIfOrderData = {
          orderId: eachOrder.orderId,
          currentSize: 0,
          filledSize: numeral(eachOrder.filledSize).add(eachOrder.currentSize).value(),
          status: 'TRADED',
          Tradeprice: eachOrder.price,
          Tradesize: eachOrder.currentSize,
          buyOrderId: order.side === 'BUY' ? order.orderId : eachOrder.orderId,
          sellOrderId: order.side === 'SELL' ? order.orderId : eachOrder.orderId,
          buyUserId: order.side === 'BUY' ? order.userId : eachOrder.userId,
          sellUserId: order.side === 'SELL' ? order.userId : eachOrder.userId,
          currency: order.currency,
        };
        const updateIfLevelData = {
          orderId: eachOrder.orderId,
          orderQty: 1,
          size: eachOrder.currentSize,
        };
        updateLevel.push(updateIfLevelData);
        updateorders.push(updateIfOrderData);
        if(orderSize === 0){
            break;
        }
    } else if(orderSize > 0){
        // console.log('Order size Else..', orderSize);
        totalSize = numeral(totalSize).add(orderSize).value();
        const updateElseOrderData = {
          orderId: eachOrder.orderId,
          currentSize: numeral(eachOrder.currentSize).subtract(orderSize).value(),
          filledSize: numeral(eachOrder.filledSize).add(orderSize).value(),
          Tradeprice: eachOrder.price,
          Tradesize: orderSize,
          buyOrderId: order.side === 'BUY' ? order.orderId : eachOrder.orderId,
          sellOrderId: order.side === 'SELL' ? order.orderId : eachOrder.orderId,
          buyUserId: order.side === 'BUY' ? order.userId : eachOrder.userId,
          sellUserId: order.side === 'SELL' ? order.userId : eachOrder.userId,
          currency: order.currency,
        };
        const updateElseLevelData = {
          orderId: eachOrder.orderId,
          orderQty: 0,
          size: orderSize,
        };
        updateLevel.push(updateElseLevelData);
        updateorders.push(updateElseOrderData);
        orderSize = 0;
        break;
      }
    }

    // Update Level that is Traded
    const RequestedLevel = {
        orderId: order.orderId,
        orderQty: orderSize === 0 ? 1 : 0,
        size: totalSize,
    };
    updateLevel.push(RequestedLevel);

    // Update User Level
    let userOrder = _.assign({}, order, {currentSize: orderSize, filledSize: totalSize});
    if(userOrder.currentSize === 0){
      userOrder.status = 'TRADED';
    }
    return {
        updatedOrders: updateorders,
        updateLevelData:updateLevel,
        updateUserOrder:userOrder,
    };
};
*/
exports.validateOrder = (order) => {
  const {side, price, currentSize:qty, currency} = order || {};
  let error = null;
  if (!SUPPORTED_CURRENCY[currency]) {
    error = `We don't support ${currency} trading right now.`;
  } else if(!side || !price || !qty || !currency) {
    error = 'Invalid Order! All required fields do not exist';
  } else {
    if(currency === 'ETH') {
      return validateETHOrder(order);
    } else if (currency === 'MIOTA') {
      return validateIOTAOrder(order);
    } else if (currency === 'XRP') {
      return validateXRPOrder(order);
    }
  }
  return error;
};
const validateIOTAOrder = (order) => {
  const {price, currentSize:qty} = order || {};
  let error = null;
  if (price <= 0) {
    error = 'Price should be more than 0';
  }
  if (isNaN(qty)) {
    error = 'Order size should be a number';
  } else {
    if (qty < 1) {
      error = 'Minimum order size for IOTA is 1 MIOTA';
    }
    const [num, dec] = String(qty).split('.');
    if (parseInt(num) > 0 && parseFloat(dec) !== 0) {
      if (parseFloat(dec) < 0.01) {
        error = 'Order size should be multiple of 0.01';
      }
    }
  }
  return error;
};
const validateETHOrder = (order) => {
  const {price, currentSize:qty} = order || {};
  let error = null;
  if (price <= 0) {
    error = 'Price should be more than 0';
  }
  if (isNaN(qty)) {
    error = 'Order size should be a number';
  } else {
    if (qty < 0.01) {
      error = 'Minimum order size for ETH is 0.01 ETH';
    }
    const [num, dec] = String(qty).split('.');
    if (parseInt(num) > 0 && parseFloat(dec) !== 0) {
      if (parseFloat(dec) < 0.01) {
        error = 'Order size should be multiple of 0.01';
      }
    }
  }
  return error;
};
const validateXRPOrder = (order) => {
  const {price, currentSize:qty} = order || {};
  let error = null;
  if (price <= 0) {
    error = 'Price should be more than 0';
  }
  if (isNaN(qty)) {
    error = 'Order size should be a number';
  } else {
    if (qty < 1) {
      error = 'Minimum order size for XRP is 1 XRP';
    }
    const [num, dec=0] = String(qty).split('.');
    if (parseFloat(dec) !== 0) {
      error = 'XRP order size should be multiple of 1';
    }
  }
  return error;
};


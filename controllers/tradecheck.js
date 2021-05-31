const _ = require('lodash');
const orderService = require('../services/order.service');
const levelService = require('../services/level.service');
const levelorderService = {};
const tradeService = require('../services/trade.service');
const accountService = require('../services/account.service');
const numeral = require('numeral');
const {costApplied, SERVER_ACCOUNT, baseCurrency} = require('../config');
const sequelize = require('../models');
const Sequelize = require('sequelize');
const channel = require('../setup/channel.js');
const {channelNames} = require('../constants/channelConstants');
const logger = require('winston');
const Promise = require('bluebird');
const serverAccountId = SERVER_ACCOUNT.userId;

exports.ordercheck = async ({createdOrder}, t) => {
  const Amt = createdOrder.side === 'BUY' ? numeral(createdOrder.price).multiply(createdOrder.currentSize).value() : createdOrder.currentSize;
  const totalAmt = createdOrder.side === 'BUY' ? numeral(Amt).add(numeral(Amt).multiply(costApplied).divide(100).value()).value() : Amt;
  const currency = createdOrder.side === 'BUY' ? baseCurrency : createdOrder.currency;
  const [userAccount, serverAccount, level, levelorder] = await Promise.all([
    accountCheck({userId: createdOrder.userId, totalAmt, currency, type:'DEBIT'}, t),
    accountCheck({userId: serverAccountId, totalAmt, currency, type:'CREDIT'}, t),
    levelCheck({price: createdOrder.price, side: createdOrder.side, size: createdOrder.currentSize, type:'ADD'}, t),
    levelordercheck({side: createdOrder.side, price: createdOrder.price, orderId: createdOrder.orderId}, t)
  ]);
  console.log('User Account:', userAccount,' Server Account:', serverAccount,'Level: ', level, 'Level Order: ', levelorder);
  return userAccount && serverAccount && level && levelorder;
};

exports.tradechek = async ({tradedData}, t) => {
  let totalsize = 0;
  let totalValue = 0;
  tradedData.map((t) => {
    totalsize = numeral(totalsize).add(t.size).value();
    const amt = numeral(t.price).multiply(t.size).value();
    const cp = numeral(t.costApplied).divide(2).value();
    totalValue = numeral(totalValue).add(amt).add(cp).value();
  });

  const [buyerTradedOrderCheck, sellerTradedOrderCheck,
    buyerAccountCheck, sellerAccountCheck,
    serverAccountCheckETH] = await Promise.all([
      tradedOrderCheck({tradedData, side: 'buyOrderId'}, t),
      tradedOrderCheck({tradedData, side: 'sellOrderId'}, t),
      tradedAccountCheck({tradedData, side: 'buyUserId'}, t),
      tradedAccountCheck({tradedData, side: 'sellUserId'}, t),
      accountCheck({userId: serverAccountId, totalAmt: totalsize, currency:tradedData[0].currency, type: 'DEBIT'}, t),
      // tradedLevelCheck({tradedData, side: 'buyOrderId'}, t),
      // accountCheck({userId: serverAccountId, totalAmt: totalValue, currency: 'INR', type: 'DEBIT'}, t)
  ]);
  console.log('buyerTradedOrderCheck', buyerTradedOrderCheck);
  console.log('sellerTradedOrderCheck', sellerTradedOrderCheck);
  console.log('buyerAccountCheck', buyerAccountCheck);
  console.log('sellerAccountCheck', sellerAccountCheck);
  console.log('serverAccountCheck', serverAccountCheckETH);
  const check = _.uniq(buyerTradedOrderCheck.concat(sellerTradedOrderCheck, buyerAccountCheck, sellerAccountCheck, serverAccountCheckETH));
  return check.length === 1 && check[0];
};

async function tradedOrderCheck({tradedData, side}, t){
  const groupedOrder = _.groupBy(tradedData, side);
  const Size = {};
  const PromiseArr = [];
  Object.keys(groupedOrder).forEach((side) => {
    const accountArray = groupedOrder[side];
    const totalSize = accountArray.reduce((prev, ac) => numeral(ac.size).add(prev).value(), 0); // add because only in INR & type = credit
    Size[side] = totalSize;
  });
  Object.keys(Size).forEach(side => {
    const amount = Size[side];
    PromiseArr.push(orderCheck({orderId: side, size: amount}, t));
  });
  const check = await Promise.all(PromiseArr);
  return check;
}

async function tradedAccountCheck({tradedData, side}, t){
  const currency = side === 'buyUserId' ? tradedData[0].currency : baseCurrency;
  const tradeSide = side;
  const groupedOrder = _.groupBy(tradedData, side);
  const Size = {};
  const PromiseArr = [];
  Object.keys(groupedOrder).forEach((side) => {
    const accountArray = groupedOrder[side];
    const totalValue = accountArray.reduce((prev, ac) => {
      const order_price = numeral(ac.size).multiply(ac.price).value();
      const cp = numeral(order_price).multiply(costApplied).divide(100).value();
      return tradeSide == 'buyUserId' ? numeral(ac.size).add(prev).value() : numeral(order_price).subtract(cp).add(prev).value();
    }, 0);
    Size[side] = totalValue;
  });
  Object.keys(Size).forEach(side => {
    const totalAmt = Size[side];
    PromiseArr.push(accountCheck({userId: side, totalAmt, currency, type: 'CREDIT'}, t));
  });
  const check = await Promise.all(PromiseArr);
  return check;
}

async function tradedLevelCheck({tradedData, side}, t){
  const groupedOrder = _.groupBy(tradedData, side);
  const Size = [];
  const PromiseArr = [];
  Object.keys(groupedOrder).forEach((side) => {
    const accountArray = groupedOrder[side];
    const totalSize = accountArray.reduce((prev, ac) => numeral(ac.size).add(prev).value(), 0); // add because only in INR & type = credit
    Size[side] = totalSize;
  });
  console.log(Size);
  Object.keys(Size).forEach(side => {
    const amount = Size[side];
    console.log('Size array...', side);
    // PromiseArr.push(orderCheck({orderId: side, size: amount}, t));
  });
  // const check = await Promise.all(PromiseArr);
  return true;
}

async function orderCheck({orderId, size}, t=null){
  const beforeOrder = await orderService.getOrderByOrderId({orderId});
  const afterOrder = await orderService.getOrderByOrderId({orderId}, t);
  const ordercheck = (beforeOrder.currentSize == numeral(afterOrder.currentSize).add(size).value()) &&
  (beforeOrder.filledSize == numeral(afterOrder.filledSize).subtract(size).value());
  console.log('Before Current and filledSize: ', beforeOrder.currentSize, beforeOrder.filledSize,
  'After Current and filledSize: ', afterOrder.currentSize, afterOrder.filledSize,
  'Size: ', size);
  console.log(`Order id ${orderId}`, (beforeOrder.currentSize == numeral(afterOrder.currentSize).add(size).value()), (beforeOrder.filledSize == numeral(afterOrder.filledSize).subtract(size).value()));
  console.log('Return ', ordercheck);
  return ordercheck;
}

async function accountCheck({userId, totalAmt, currency, type}, t=null){
  const [beforeuserBalance, afteruserBalance] = await Promise.all([
    accountService.getBalanceByUserId({userId}),
    accountService.getBalanceByUserId({userId},t),
  ]);
  const beforeuseraccount = beforeuserBalance.find((account) => account.currency === currency);
  const afteruseraccount = afteruserBalance.find((account) => account.currency === currency);
  const isVerified = type === 'DEBIT' ?
    numeral(beforeuseraccount.value).value() === numeral(afteruseraccount.value).add(totalAmt).value() :
    numeral(beforeuseraccount.value).add(totalAmt).value() === numeral(afteruseraccount.value).value();
  console.log('Before: ', numeral(beforeuseraccount.value).value() ,'After: ', numeral(afteruseraccount.value).value(), 'Amount: ', totalAmt);
  return isVerified;
}

async function levelCheck({price, side, size, type}, t){
  const [beforelevel, afterlevel] = await Promise.all([
    levelService.getLevel({price: price, side: side}),
    levelService.getLevel({price: price, side: side}, t),
  ]);

  const LEVEL_CHECK = type === 'ADD' ?
    (beforelevel ? numeral(afterlevel.size).value() === numeral(beforelevel.size).add(size).value()
    && afterlevel.orderQty === parseInt(beforelevel.orderQty)+1
  : afterlevel.size == size
    && afterlevel.orderQty === 1)
    :
    (afterlevel ? numeral(afterlevel.size).value() === numeral(beforelevel.size).subtract(size).value()
    && afterlevel.orderQty === parseInt(beforelevel.orderQty)-1
  : beforelevel.size == size
    && beforelevel.orderQty === 1);

  console.log('Before Size and Qty : ', beforelevel ? beforelevel.size+' '+beforelevel.orderQty : 0+' '+0  ,', After Size and Qty: ', afterlevel.size +' '+ afterlevel.orderQty, ', Added Size and Qty: ', size, 1);
  return LEVEL_CHECK;
}

async function levelordercheck({side,price,orderId},t){
  const level = await levelService.getLevel({price, side}, t);
  const [beforelevelOrder, afterlevelOrder] = await Promise.all([
    levelorderService.isLevelOrder({levelId: level.levelId , orderId: orderId}),
    levelorderService.isLevelOrder({levelId: level.levelId , orderId: orderId}, t),
  ]);
  const oklevelorder = beforelevelOrder !== afterlevelOrder ? true : false;
  return oklevelorder;
}

exports.cancelOrder = async (orderId) => {
  const globalChannel = channel.getChannel(channelNames.TRADE);
  sequelize.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE}).then(async (t) => {
    try {
      let promiseArr = [];
      const canceledOrder = await orderService.updateOrder(orderId,{status:'CANCELLED'}, t);
      console.log(canceledOrder);
      promiseArr.push(levelService.updateLevelByPriceAndSide({price: canceledOrder.price, side: canceledOrder.side, size: canceledOrder.currentSize, orderQty: 1}, t));
      promiseArr.push(levelorderService.removeByOrderId({orderIds: [canceledOrder.orderId]}, t));

      if(canceledOrder.side === 'BUY'){
        const amt = numeral(canceledOrder.price).multiply(canceledOrder.currentSize).value();
        const extraCost = numeral(amt).multiply(costApplied).divide(100).value();
        const totalAmount = numeral(amt).add(extraCost).value();
        logger.info(`Return Amt ${totalAmount}`);
        promiseArr.push(accountService.creditBalance(canceledOrder.userId, baseCurrency, totalAmount, t));
        promiseArr.push(accountService.debitBalance(serverAccountId, baseCurrency, totalAmount, t));
      } else {
        promiseArr.push(accountService.creditBalance(canceledOrder.userId, canceledOrder.currency, canceledOrder.currentSize, t));
        promiseArr.push(accountService.debitBalance(serverAccountId, canceledOrder.currency, canceledOrder.currentSize, t));
      }
      const response = await Promise.all(promiseArr);
      logger.info(`Response of Cancelled Order ${JSON.stringify(response[2])}`);
      globalChannel.sendCancelledOrderNotification(canceledOrder);
      globalChannel.sendUserAccountNotification([response[2]]);
      await t.commit();
      return canceledOrder;
    } catch(err) {
      console.log('Cancel Order Error', err);
      t.rollback();
      return ({message: 'Error while cancell order..Roll back all transactions', error: err});
    }
  });
};

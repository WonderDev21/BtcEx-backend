const Promise = require('bluebird');
const logger = require('winston');
const _ = require('lodash');
const Sequelize = require('sequelize');
const Trade = require('../models').models.Trade;
const User = require('../models').models.User;
const sequelize = require('../models');
const config = require('../config');// get from config.
const {arrayToJSON, objectToJSON} = require('../utils/jsonUtils');
const userService = require('./user.service');
const accountService = require('./account.service');
const jobApi = require('../api/jobapi');
const numeral = require('numeral');
const tradeUtils = require('../utils/tradeUtils');
const {currencyTypes} = require('../constants/orderConstants');

const {SUPPORTED_CURRENCY, costApplied, fees, SERVER_ACCOUNT, USER_REFERRAL_TOKEN, USER_REFERRAL_BONUS_ENABLED, USER_REFERRAL_BONUS} = config;
const serverAccountId = SERVER_ACCOUNT.userId;

exports.addNewTrade = async (data, t=null) => {
  const totalcostApplied = numeral(data.tradePrice).multiply(data.tradeSize).multiply(costApplied).multiply(2).divide(100).value();
  const buyerFee = numeral(data.tradePrice).multiply(data.tradeSize).multiply(fees.buyerFee).divide(100).value();
  const sellerFee = numeral(data.tradePrice).multiply(data.tradeSize).multiply(fees.sellerFee).divide(100).value();
  const trade = objectToJSON (await Trade.create({
    costApplied: totalcostApplied,
    price: data.tradePrice,
    buyerFee: buyerFee,
    sellerFee: sellerFee,
    size: data.tradeSize,
    currency: data.currency,
    buyOrderId: data.buyOrderId,
    sellOrderId: data.sellOrderId,
    buyUserId: data.buyUserId,
    sellUserId: data.sellUserId,
  }, {transaction: t}));
  if(USER_REFERRAL_BONUS_ENABLED) {
  const buyerTradeCount = await Trade.count({where: {$or: [{sellUserId: data.buyUserId}, {buyUserId: data.buyUserId}]}});
  const sellerTradeCount = await Trade.count({where: {$or: [{sellUserId: data.sellUserId}, {buyUserId: data.sellUserId}]}});
    if(!buyerTradeCount) {
      const buyer = objectToJSON(await User.find({
        attributes: ['email', 'referredby'],
        where: {userId: data.buyUserId}}));
      if(buyer.referredby) {
        const referredUser = await userService.getUserByCustomerId(buyer.referredby);
        if (referredUser) {
          const referralOptions = {remarks: `Referral bonus for ${buyer.email} registration`};
          await accountService.debitBalance(serverAccountId, USER_REFERRAL_TOKEN, USER_REFERRAL_BONUS, t, _.assign({}, referralOptions, {beneficiary: referredUser.userId}));
          await accountService.creditBalance(referredUser.userId, USER_REFERRAL_TOKEN, USER_REFERRAL_BONUS, t, _.assign({}, referralOptions, {beneficiary: serverAccountId}));
        }
      }
    }
    if(!sellerTradeCount && data.buyUserId !== data.sellUserId) {
      const seller = objectToJSON(await User.find({
        attributes: ['email', 'referredby'],
        where: {userId: data.sellUserId}}));
      if(seller.referredby) {
        const referredUser = await userService.getUserByCustomerId(seller.referredby);
        if (referredUser) {
          const referralOptions = {remarks: `Referral bonus for ${seller.email} registration`};
          await accountService.debitBalance(serverAccountId, USER_REFERRAL_TOKEN, USER_REFERRAL_BONUS, t, _.assign({}, referralOptions, {beneficiary: referredUser.userId}));
          await accountService.creditBalance(referredUser.userId, USER_REFERRAL_TOKEN, USER_REFERRAL_BONUS, t, _.assign({}, referralOptions, {beneficiary: serverAccountId}));
        }
      }
    }
  }
  // const buyer = await documentService.getUserInfo(data.buyUserId);
  // const seller = await documentService.getUserInfo(data.sellUserId);

  // // const inv = {
  // //   buyer: tradeUtils.getBuyerTradeDataForInvoice(buyer, trade),
  // //   seller: tradeUtils.getSellerTradeDataForInvoice(seller, trade),
  // // };
  // // jobApi.createInvoice(inv);
  return trade;
};
exports.getDailyTrades = async (currency = currencyTypes.ETH, from , to) => {
  const trades = await sequelize.query(`
  select q1.close, q2.open, q1.date_trunc as "date", q3.volume, q3.high, q3.low
    from (
    select price as close, date_trunc('day', "createdAt") from (
    select *, ROW_NUMBER() OVER(partition by 
                          date_trunc('day', "createdAt") order by "createdAt" desc) as rn FROM "Trades"
			   where "Trades"."currency" = '${currency}' AND "Trades"."createdAt" BETWEEN '${from}' AND '${to}'
    )a where a.rn=1 order by "createdAt"
  ) q1
join (
	select price as open, date_trunc('day', "createdAt") from (
  select *,ROW_NUMBER() OVER(partition by 
                       date_trunc('day', "createdAt") order by "createdAt" asc) as rn FROM "Trades"
                       where "Trades"."currency" = '${currency}' AND "Trades"."createdAt" BETWEEN '${from}' AND '${to}'
  )a where a.rn=1 order by "createdAt"  
  ) q2
  on q1.date_trunc = q2.date_trunc
join (
 	SELECT sum("size") as "volume", max("price") as "high", min("price") as "low", date_trunc('day', "createdAt")
  FROM "Trades"
  where "Trades"."currency" = '${currency}' AND "Trades"."createdAt" BETWEEN '${from}' AND '${to}'
  GROUP BY date_trunc('day', "createdAt")
  ORDER by date_trunc('day', "createdAt") ASC
 ) q3
 on q3.date_trunc = q1.date_trunc
  `, {type: Sequelize.QueryTypes.SELECT});
  return trades;
};
exports.getAllTrades = async (currency = currencyTypes.ETH) => arrayToJSON(await Trade.findAll({
    attributes: ['price', 'size', 'currency', 'createdAt'],
    where: {currency: currency},
    order: [['createdAt', 'DESC']],
    limit: 20
}));
exports.getAllCurrencyTrades = async(limit) => {
  let trades = {};
  for(let currency in SUPPORTED_CURRENCY ) {
    trades[currency] = arrayToJSON(await Trade.findAll({
      attributes: ['price', 'currency', 'createdAt'],
      where: {currency},
      order: [['createdAt', 'DESC']],
      limit
    }));
  }
  return trades;
};
exports.getUserTrades = async (userId, offset) => {
  const merge = (A, B) => {
    const m = A.length;
    const n = B.length;
    let i = m - 1;
    let j = n - 1;
    let k = m + n - 1;
    while (k >= 0) {
        if (j < 0 || (i >= 0 && Date.parse(A[i].createdAt) < Date.parse(B[j].createdAt) )) {
          A[k--] = A[i--];
        } else {
          A[k--] = B[j--];
        }
    }
    return A;
  };

  const buyTrades = arrayToJSON(
    await Trade.findAll({
    attributes: ['price', 'size', 'buyerFee', 'createdAt', 'currency', 'tradeId'],
    where: {buyUserId: userId},
    order: [['createdAt', 'DESC']],
    offset: offset,
    limit: 10
  })
  );
  const sellTrades = arrayToJSON(await Trade.findAll({
    attributes: ['price', 'size', 'sellerFee', 'createdAt', 'currency', 'tradeId'],
    where: {sellUserId: userId},
    order: [['createdAt', 'DESC']],
    offset: offset,
    limit: 10
  }));
  buyTrades.forEach(bt => bt.side = 'BUY');
  sellTrades.forEach(st => st.side = 'SELL');
  return merge(buyTrades, sellTrades);
};
exports.getAllTradesAdmin = async () => arrayToJSON(await Trade.findAll({order: [['createdAt', 'DESC']]}));

exports.getTradeById = async (tradeId) => await Trade.find({where: {tradeId: tradeId}});

exports.getLastTradeDetails = async () => {
  const lastTrade = await Trade.findAll({
    order: [['createdAt','DESC']],
  });
  // console.log('Trade List',arrayToJSON(lastTrade));
  return objectToJSON(lastTrade[0]);
};

exports.lowestTradeDetails = async (currency, startTime, endTime) => {
  const lowestTrade = await Trade.findAll({
   where: {
      createdAt: {$and: [{$gte : new Date(startTime)}, {$lte : new Date(endTime)}]},
      currency: currency,
    },
    order: [['price','ASC'],['createdAt','ASC']],
  });
  return lowestTrade[0].toJSON();
};

exports.highestTradeDetails = async (currency, startTime, endTime) => {
  const highestTrade = await Trade.findAll({
   where: {
      createdAt: {$and: [{$gte : new Date(startTime)}, {$lte : new Date(endTime)}]},
      currency: currency,
    },
    order: [['price','DESC'],['createdAt','ASC']],
  });
  return highestTrade[0].toJSON();
};

exports.average = async (currency, startTime, endTime) => {
  const allTrade = await Trade.findAll({
   where: {
      createdAt: {$and: [{$gte : new Date(startTime)}, {$lte : new Date(endTime)}]},
      currency: currency,
    },
  });
  let totalPrice=0;
  let totalSize=0;
  allTrade.map((trade) => {
    const tradePrice = numeral(trade.price).multiply(trade.size).value();
    totalPrice=numeral(totalPrice).add(tradePrice).value();
    totalSize=numeral(totalSize).add(trade.size).value();
  });
  return numeral(totalPrice).divide(totalSize).value();
};

exports.get24HrsTrades = async (currency) => {
  const highestTrade = await Trade.findAll({
    where: {
      createdAt: {$lte : new Date(Date.now() - (24 * 60 * 60 * 1000))},
      currency: currency,
    },
    order: [['createdAt','DESC']],
    limit: 1,
  });
  return highestTrade.length ? arrayToJSON(highestTrade)[0] : {price: 0, size: 0, currency};
};
exports.getCurrencyLastTrade = async (currency) => {
  const lastTrade = await Trade.findAll({
    attributes: ['price', 'size', 'currency', 'createdAt'],
    where: {currency: currency},
    order: [['createdAt', 'DESC']],
    limit: 1
  });
  return arrayToJSON(lastTrade)[0] || {price: 0, size: 0, currency};
};

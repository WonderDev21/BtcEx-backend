const _ = require('lodash');
const moment = require('moment');
const request = require('axios');
const logger = require('winston');
const config = require('../config');
const queryString = require('query-string');
const orderService = require('../services/order.service');
const redisService = require('../services/redis.service');
const tradeService = require('../services/trade.service');
const exchangeService = require('../services/poloneix.service');
const {currencyTypes} = require('../constants/orderConstants');
const redisConstants = require('../constants/redisConstants');
const cryptoCurrencies = require('../constants/cryptoCurrencies');


exports.getTicker = async (req, res) => {
  // Hourly // Daily //Weekly // Monthly
  const startTime = req.body.startTime;
  const endTime = req.body.endTime;
  const currency = res.query.currency || currencyTypes.ETH;
  try {
    const bestSeller = await orderService.getBestSeller(currency, startTime, endTime);
    const bestBuyer = await orderService.getBestBuyer(currency, startTime, endTime);
    const lastTraded = await tradeService.getLastTradeDetails();
    const lowestTrade = await tradeService.lowestTradeDetails(currency, startTime, endTime);
    const highestTrade = await tradeService.highestTradeDetails(currency, startTime, endTime);
    const average = await tradeService.average(currency, startTime, endTime);
    const currentSellerVol = await orderService.sellerVol(currency, startTime, endTime);
    const currentBuyerVol = await orderService.buyerVol(currency, startTime, endTime);
    /*
    console.log('bestSeller', bestSeller);
    console.log('bestBuyer', bestBuyer);
    console.log('lastTraded', lastTraded);
    console.log('lowestTrade', lowestTrade);
    console.log('highestTrade', highestTrade);
    console.log('average', average);
    console.log('currentSellerVol', currentSellerVol);
    console.log('currentBuyerVol', currentBuyerVol);
    */
    res.status(200).send({bestSeller, bestBuyer, lastTraded, lowestTrade, highestTrade, average, currentSellerVol, currentBuyerVol});
  } catch(error) {
    res.status(400).send(error);
  }
};
exports.getCurrencyPriceList = async (req, res) => {
  try {
    const data = await exchangeService.getCurrencyPrice();
    res.status(200).send(data);
  } catch(error) {
    res.status(400).send(error);
  }
};
exports.getAllCurrencyPrice = async (req, res) => {
  logger.info('Getting market prices of currencies');
  try {
    const priceObj = await orderService.getCurrencyBestSellers();
    res.status(200).send(priceObj);
  } catch(err) {
    res.status(400).send(err);
  }
};
exports.getCurrencyGraph = async (req, res) => {
  const currency = _.get(req, 'query.currency', null);
  let graphData = null;
  graphData = await redisService.getValue(`${redisConstants.GRAPH}-${currency}`);
  if (graphData) {
    return res.status(200).send(graphData);
  }
  try {
    const endTIme = moment().valueOf();
    const startTime = moment().subtract(60, 'day').valueOf();
    const found = cryptoCurrencies.find(x => x.symbol === currency);
    if (found) {
      let tmp = await request.get(`https://graphs2.coinmarketcap.com/currencies/${found.slug}/${startTime}/${endTIme}/`);
      tmp = _.get(tmp, 'data.price_usd', []);
      graphData = [];
      _.forEach(tmp, val => {
        graphData.push({time: val[0], usd: val[1]});
      });
    } else {
      graphData = null;
    }
    await redisService.setExpire(`${redisConstants.GRAPH}-${currency}`, JSON.stringify(graphData), 300); // 5mins = 300 seconds cache
    res.status(200).send(graphData);
  } catch(error) {
    res.status(400).send(error);
  }
};
exports.getConversionRates = async (req, res) => {
  const rates = await redisService.getValue('CURRENCY-FIXER');
  if(rates) {
    res.status(200).send(JSON.parse(rates));
  } else {
    const qs = queryString.stringify({base: 'USD'});
    const url = `${config.EXCHANGE_RATE_URL}?${qs}`;
    try {
      const resp = await request.get(url);
      await redisService.setExpire('CURRENCY-FIXER', JSON.stringify(resp.data), 3600);
      res.status(200).send(resp.data);
    } catch(err) {
      res.status(400).send({message: 'Error', err});
    }
  }
};
/*
  ETH: https://etherchain.org/api/statistics/price,
  BTC: https://api.coindesk.com/v1/bpi/historical/close.json?start=${startTime}&end=${endTime},
  XRP: https://data.ripple.com/v2/exchanges/XRP/USD+rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q/?result=tesSUCCESS&type=OfferCreate&start=${startTime}&end=${endTime},
*/

const autobahn = require('autobahn');
const request = require('axios');
const logger = require('winston');
const _ = require('lodash');
const numeral = require('numeral');
const currencyBASE = 'USD';
const wsuri = 'wss://api.poloniex.com';
const bitCoinPriceAPI = 'https://api.coinmarketcap.com/v1/ticker/bitcoin/';
const usdpriceRate = 'http://api.fixer.io/latest?base=USD';
const poloneixTickerPriceAPI = 'https://poloniex.com/public?command=returnTicker';
const channel = require('../setup/channel.js');
const {channelNames} = require('../constants/channelConstants');
const {NotificationTypes} = require('../constants/notificationConstants');
const redisConstants = require('../constants/redisConstants');
const redisService = require('./redis.service');
let currencyMap = {};
let currencyLastUpdateTime = new Date();
let bitCoinPriceinUSD = 0;
const CMC_PRO_API_KEY = 'e87723da-26c3-426d-8b44-7834b07f5f32';

let cryptoCurrencyMap = {};

const connection = new autobahn.Connection({
  url: wsuri,
  realm: 'realm1',
  max_retries: -1,
});
connection.onopen = function (session) {
  const globalChannel = channel.getChannel(channelNames.QUEUE);
	function tickerEvent (args,kwargs) {
    const [currencyPair, last, lowestAsk, highestBid, percentChange, baseVolume, quoteVolume, isFrozen, _24hrHigh, _24hrLow] = args;
    const [from, to] = currencyPair.split('_');
    if (from === 'BTC') {
      cryptoCurrencyMap[to] = {change: percentChange, price: numeral(bitCoinPriceinUSD).multiply(lowestAsk).value()};
      console.log('GETTING:: ', cryptoCurrencyMap);
      globalChannel.sendToQueue(NotificationTypes.MARKET_TICKER, cryptoCurrencyMap);
    }
	}
	session.subscribe('ticker', tickerEvent);
};
connection.onclose = function () {
  console.log('Websocket connection closed');
};

async function getBitcoinPrice() {
  let tmp = null;
  try {
    const response = await request.get(bitCoinPriceAPI);
    tmp = _.get(response, 'data[0]', null);
  } catch(err) {
    logger.info('Error fetching Coinmarketcap ticker API', err);
    console.log('Some error fetching Bitcoin Price');
  }
  bitCoinPriceinUSD = _.get(tmp, 'price_usd', bitCoinPriceinUSD);
  cryptoCurrencyMap['BTC'] = {change: _.get(tmp, 'percent_change_24h', 0), price: numeral(bitCoinPriceinUSD).value()};
}

async function getBitcoinPriceInUsd(){
  let priceInUSD = 0;
  const response = await request.get(bitCoinPriceAPI);
  tmp = _.get(response, 'data[0]', null);
  priceInUSD = _.get(tmp, 'price_usd', priceInUSD);
  return priceInUSD;
}
exports.startTicker = async () => {
  console.log('Ticker started');
  let intervalId = null;
  try {
    const x = await getBitcoinPrice();
    connection.open();
    intervalId = setInterval(() => getBitcoinPrice(), 40000);
  } catch(error) {
    console.log('Some error', error);
    clearInterval(intervalId);
  }
};
exports.getCurrencyPrice = async () => {
  try {
    const marketRates = await redisService.getValue(redisConstants.COINMARKET_RATES);
    if(marketRates) {
      return marketRates;
    } else {
      // https://api.coinmarketcap.com/v1/ticker
      const response = await request.get(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?CMC_PRO_API_KEY=${CMC_PRO_API_KEY}&limit=10`);
      if (response.status !== 200) {
        logger.info('Coinmarketcap API failed', response);
      }
      const results = _.get(response, 'data.data', {});
      const resultMap = {};
      results.forEach((coinData) => {
        const {quote: {USD: {price, percent_change_24h}}, symbol} = coinData;
        resultMap[symbol] = {change: percent_change_24h, price: price};
      });
      await redisService.setExpire(redisConstants.COINMARKET_RATES, JSON.stringify(resultMap), 120);
      return resultMap;
    }
  } catch(error) {
    logger.info('Coinmarketcap API failed', response);
    return error;
  }
};

async function getusdToCurrencyPrice(currency){
  const response = await request.get(usdpriceRate);
  return response.data.rates[currency];
}

exports.getPrice = async (cryptoCurrencyFilter = ['BCN','BLK','BTCD','ETH'], currency='USD') => {
  const data = require('./BTC.data.json');
  // const bitCoinPrice = await getBitcoinPriceInUsd();       // Call only once
  let usdToCurrency = await getusdToCurrencyPrice(currency);  // Call only once
  usdToCurrency = usdToCurrency ? usdToCurrency : 1;
  const bitCoinPrice = 16617.4;
  logger.info('usdToCurrency', usdToCurrency, bitCoinPrice);
  const BitCoinCurrency = [];
  Object.keys(data).map((objectKey, index) => {
    const objectData = data[objectKey];
    const {lowestAsk, highestBid, percentChange, high24hr, low24hr} = objectData;
    const [from, to] = objectKey.split('_');
    if (from === 'BTC' && _.intersection([to],cryptoCurrencyFilter).length > 0) {
      BitCoinCurrency.push({
        currency: to, lowestAsk: lowestAsk*bitCoinPrice*usdToCurrency,
        highestBid: highestBid*bitCoinPrice*usdToCurrency, percentChange:percentChange,
        high24hr: high24hr*bitCoinPrice*usdToCurrency, low24hr:low24hr*bitCoinPrice*usdToCurrency});
    }
  });
  return _.orderBy(BitCoinCurrency,['currency'],['asc']);
};
// getBitcoinPrice();
// module.exports = startTicker;

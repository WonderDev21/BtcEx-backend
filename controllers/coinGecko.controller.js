const _ = require('lodash');
const request = require('request');
const {baseCurrency, CURRENCY} = require('../config');
const coinGecko = require('../services/coinGecko.service');

exports.getPairs = async (req, res) => {
  const data = [];
  for(const key in CURRENCY) {
    if (CURRENCY[key] && CURRENCY[key] !== 'USD') {
      data.push({
        ticker_id: `${baseCurrency}_${CURRENCY[key]}`,
        base: baseCurrency,
        target: CURRENCY[key]
      });
    }
  }
  res.status(200).send(data);
};

// eslint-disable-next-line max-statements
exports.getTickers = async (req, res) => {
  let startTime = null;
  let endTime = null;
  if (+req.query.startTime) {
    startTime = +req.query.startTime;
  } else {
    startTime = new Date();
    startTime.setHours(0, 0, 0, 0);
  }

  if (+req.query.endTime) {
    endTime = +req.query.endTime;
  } else {
    endTime = new Date();
    endTime.setHours(23, 59, 59, 59);
  }

  const currency = req.query.currency || null;
  try {
    const latestPrice = await coinGecko.getLatestPrice(currency, startTime, endTime);
    const latestPriceGroupedByCurrency = _.groupBy(latestPrice, 'target_currency');
    const lastPrice = [];
    Object.keys(latestPriceGroupedByCurrency).forEach(priceItem => {
      if (latestPriceGroupedByCurrency[priceItem]) {
        lastPrice.push(latestPriceGroupedByCurrency[priceItem][0]);
      }
    });
    const bidAndAsk = await coinGecko.getBidAndAsk(currency, startTime, endTime);
    const highAndLow = await coinGecko.getHighAndLow(currency, startTime, endTime);
    const sellerVolume = await coinGecko.getSellerVolume(currency, startTime, endTime);
    const buyerVolume = await coinGecko.getBuyerVolume(currency, startTime, endTime);

    const combineArray = [...lastPrice, ...bidAndAsk, ...highAndLow, ...sellerVolume, ...buyerVolume];
    const groupedCurrency = _.groupBy(combineArray, 'target_currency');
    const finalRes = [];
    Object.keys(groupedCurrency).forEach(key => {
      let mergeItems = {
        ticker_id: null,
        base_currency: baseCurrency,
        target_currency: null,
        last_price: null,
        base_volume: null,
        target_volume: null,
        bid: null,
        ask: null,
        high: null,
        low: null,
      };
      const combineObjects = {};
      groupedCurrency[key].forEach(item => {
        Object.keys(item).forEach(itemKey => {
          if (combineObjects[itemKey] === undefined) {
            combineObjects[itemKey] = item[itemKey];
          }
        });
      });
      finalRes.push(Object.assign({}, mergeItems, combineObjects));
    });
    finalRes.forEach(item => {
      item.ticker_id = `${item.base_currency}_${item.target_currency}`;
    });
    res.status(200).send(finalRes);
  } catch(error) {
    console.log(error);
    res.status(400).send(error);
  }
};

exports.getOrderbook = async (req, res) => {
  const ticker_id = req.query.ticker_id;
  const depth = req.query.depth || 100;
  try {
    const target_currency = ticker_id.split('_')[1];
    const bids = await coinGecko.getBids(target_currency, depth / 2);
    const modifiedBids = bids.map(bid => [bid.price, (+bid.currentSize + +bid.filledSize)]);
    const asks = await coinGecko.getAsks(target_currency, depth / 2);
    const modifiedAsks = asks.map(ask => [ask.price, (+ask.currentSize + +ask.filledSize)]);
    const finalRes = {
      ticker_id,
      timestamp: Date.now(),
      bids: modifiedBids,
      asks: modifiedAsks,
    };
    res.status(200).send(finalRes);
  } catch(error) {
    console.log(error);
    res.status(400).send(error);
  }
};

exports.getTradeHistory = async (req, res) => {
  const {ticker_id, limit, type, start_time, end_time} = req.query;
  try {
    const target_currency = ticker_id.split('_')[1];
    const buyHistory = await coinGecko.getBuyTradeHistory(target_currency, limit, type, start_time, end_time);
    buyHistory.forEach(item => {
      item.base_volume = '1';
      item.type = item.buyTrade.type;
      delete item.buyTrade;
    });
    const sellHistory = await coinGecko.getSellTradeHistory(target_currency, limit, type, start_time, end_time);
    sellHistory.forEach(item => {
      item.base_volume = '1';
      item.type = item.sellTrade.type;
      delete item.sellTrade;
    });
    const finalRes = {
      buy: buyHistory,
      sell: sellHistory
    };
    res.status(200).send(finalRes);
  } catch(error) {
    console.log(error);
    res.status(400).send(error);
  }
};

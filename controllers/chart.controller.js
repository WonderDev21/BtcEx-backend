const _ = require('lodash');
const moment = require('moment');
const {baseCurrency} = require('../config');
const tradeService = require('../services/trade.service');

let query_ts = {}; // [symbol] : ts
let prev_history = {};

exports.getGraph = async (req, res) => {
  const symbol = _.get(req, 'query.symbol', []);
  const timeNow = Date.now();
  if (query_ts[symbol] && prev_history[symbol]) {
    const diff = timeNow - query_ts[symbol];
    if(diff < 10000) {
      return res.status(200).send(prev_history[symbol]);
    }
  }
  const from = moment().subtract(1, 'year').format('YYYY-MM-DD');
  const to = moment(_.get(req, 'query.to') * 1000).add(1, 'day').format('YYYY-MM-DD');
  const currency = symbol.split('-')[0];
  const trades = await tradeService.getDailyTrades(currency, from, to);
  const unixDay = 86400;
  const dayRange = {};
  const tradeMap = {};
  const history = {
    o: [],
    c: [],
    h: [],
    l: [],
    t: [],
    v: [],
    s: 'ok'
  };
  if (trades[0]) {
    const firstTradeDate = parseInt(new Date(trades[0].date).getTime() / 1000);
    const currentTime = Date.now() / 1000;
    for(let i = firstTradeDate; i < currentTime; i += unixDay) {
      dayRange[i] = 1;
    }
  } else {
    history.s = 'no_data';
    return res.status(200).send(history);
  }
  _.forEach(trades, (trade, index) => {
      const time = parseInt(new Date(trade.date).getTime() / 1000);
      tradeMap[time] = trade;
  });
  let flag = 0;
  _.forEach(dayRange, (dd, key) => {
    const trade = tradeMap[key];
      if(trade) {
        flag = 1;
        const volume = parseFloat(trade.volume);
        const high = parseFloat(trade.high);
        const low = parseFloat(trade.low);
        const open = parseFloat(trade.open);
        const close = parseFloat(trade.close);

        history.t.push(parseInt(key));
        history.v.push(volume);
        history.o.push(open);
        history.c.push(close);
        history.h.push(high);
        history.l.push(low);
      } else {
        history.t.push(parseInt(key));
        history.v.push(0);
        history.o.push(0);
        history.c.push(0);
        history.h.push(0);
        history.l.push(0);
      }
  });
  if (flag === 0 ){
    history.s = 'no_data';
  }
  query_ts[symbol] = Date.now();
  prev_history[symbol] = history;
  // await redisService.setExpire(redisConstants.TICKER+'-'+currency, JSON.stringify(history), 60);
  return res.status(200).send(history);
};
exports.getConfig = async(req, res) => {
  const data = {
    supports_search: true,
    supports_group_request: false,
    supports_marks: false,
    supports_timescale_marks: false,
    supports_time: true,
    exchanges: [
      {value: `ETH-${baseCurrency}`, 'name': 'Ethereum', 'desc' : 'Ethereum'},
      {value: `LTC-${baseCurrency}`, 'name': 'LiteCoin', 'desc' : 'LiteCoin'},
      {value: `BTC-${baseCurrency}`, 'name': 'BitCoin', 'desc': 'BitCoin'},
      {value: `XRP-${baseCurrency}`, 'name': 'Ripple', 'desc': 'Ripple'},
      {value: `BXC-${baseCurrency}`, 'name': 'BXC', 'desc': 'BXC Token'},
      {value: `USD-${baseCurrency}`, 'name': 'USD', 'desc': 'US Dollar'},
      {value: `INR-${baseCurrency}`, 'name': 'INR', 'desc': 'Indian Rupees'},
    ],
    symbols_types: [{name: 'All types', value: ''}],
    supported_resolutions: ['1', '5', '15', '60', '120', '360', '1D', '1W'],
  };
    res.status(200).send(data);
};
exports.getTime = async(req, res) => {
  const t = Math.floor(Date.now() / 1000);
  res.send(`${t}`);
};
exports.getCurrencyInfo = async(req, res) => {
  const currency = req.query.symbol;
  const data = {
    ticker: `${currency}-${baseCurrency}`,
    minmov2:0,
    session: '24x7',
    timezone: 'Asia/Kolkata',
    has_intraday: true,
    description: `${currency}/${baseCurrency}`,
    supported_resolutions: ['1', '5', '15', '60', '120', '360', '1D', '1W'],
    type: 'stock',
    currency_code: currency,
    'exchange-listed': 'BtcEX',
    volume_precision: 8,
    pointvalue:1,
    name: `${currency}-${baseCurrency}`,
    'exchange-traded': '',
    minmov: 1,
    pricescale:1000000,
  };
  res.status(200).send(data);
};
exports.getMarks = async(req, res) => {
  res.sendStatus(200);
};

module.exports = {
  // Unified Cryptoasset ID for coin market cap
  UCI_DATA: {
    BTC: {
      'id': 1,
      'name': 'Bitcoin',
      'symbol': 'BTC',
    },
    BXC: {
      'id': 4945,
      'name': 'BtcEX Coin',
      'symbol': 'BXC',
    },
    ETH: {
      'id': 1027,
      'name': 'Ethereum',
      'symbol': 'ETH',
    },
    LTC: {
      'id': 2,
      'name': 'Litecoin',
      'symbol': 'LTC',
    },
    USDT: {
      'id': 825,
      'name': 'Tether',
      'symbol': 'USDT',
    },
    XRP: {
      'id': 52,
      'name': 'XRP',
      'symbol': 'XRP'
    },
    USD: {
      'id': 825,
      'name': 'XRP',
      'symbol': 'XRP'
    },
  },
  CURRENCY_LIMITS: {
    BTC: {
      MIN_WITHDRAW: 0.001,
      MIN_DEPOSIT: 0.001,
      MAX_WITHDRAW: 10,
    },
    BXC: {
      MIN_WITHDRAW: 0.001,
      MIN_DEPOSIT: 0.001,
      MAX_WITHDRAW: 10,
    },
    ETH: {
      MIN_WITHDRAW: 0.02,
      MIN_DEPOSIT: 400,
      MAX_WITHDRAW: 0.02,
    },
    LTC: {
      MIN_WITHDRAW: 0.02,
      MIN_DEPOSIT: 0.02,
      MAX_WITHDRAW: 1750,
    },
    USDT: {
      MIN_WITHDRAW: 10,
      MIN_DEPOSIT: 10,
      MAX_WITHDRAW: 100000,
    },
    XRP: {
      MIN_WITHDRAW: 0.2,
      MIN_DEPOSIT: 0.2,
      MAX_WITHDRAW: 390000,
    },
  },
};

/*
  ======= IMPORTANT NO RELATIVE IMPORTS IN THIS FILE =======
*/

const path = require('path');
const _ = require('lodash');
const feeStructure = require('./fees.json');
const withdrawalFees = _.reduce(feeStructure, (res, val, key) => {
  res[key] = val.withdrawal_fees; return res;
}, {});

const depositFees = _.reduce(feeStructure, (res, val, key) => {
  res[key] = val.deposit_fees;
  return res;
}, {});

module.exports = {
  APP_URL: 'https://www.btcex.pro',
  APP_NAME: 'BtcEX',
  SUPPORT_EMAIL: 'support@btcex.pro',
  costApplied: process.env.COST_PERCENT || 0.5, // in percentage
  feeStructure: feeStructure,
  fees: { // further maker and taker fees can be implemented
    buyerFee: 0.2,
    sellerFee: 0.2,
  },
  RANDOM_USER_BONUS_ENABLED: process.env.RANDOM_USER_BONUS_ENABLED === 'true',
  USER_REFERRAL_BONUS_ENABLED: process.env.USER_REFERRAL_BONUS_ENABLED === 'true',
  USER_REFERRAL_BONUS: parseInt(process.env.USER_REFERRAL_BONUS || 0),
  SIGNUP_BONUS: parseInt(process.env.SIGNUP_BONUS || 0),
  USER_REFERRAL_TOKEN: process.env.USER_REFERRAL_TOKEN,
  baseCurrency: 'USDT',
  messageBrokerURL: process.env.messageBrokerURL,
  /* SUPPORTED CURRENCIES */
  IEO_CURRENCY: {CWT: 'CWT', MYOB: 'MYOB'},
  FIAT_CURRENCY: {USD: 'USD', INR: 'INR'},
  CURRENCY: {USDT: 'USDT', USD: 'USD', INR: 'INR', ETH: 'ETH', XRP: 'XRP', LTC: 'LTC', BTC: 'BTC', BXC: 'BXC'},
  SUPPORTED_CURRENCY: {USDT: 'USDT', INR: 'INR', USD: 'USD', ETH: 'ETH', XRP: 'XRP', LTC: 'LTC', BTC: 'BTC', BXC: 'BXC'},
  WITHDRAWAL_FEE: withdrawalFees,
  DEPOSIT_FEE: depositFees,
  HASHID_SALT: process.env.HASHID_SALT || 'PlfRh17BDbsJIZ#vA00$5&6kho9eyP',
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || 'AKIAI7XVH3APM2RRGTGQ',
  // RIPPLE_ADDRESS: 'rBkKHhUJMJnnwmw6aeu4W1dBYNFL6vseoN',
  // RIPPLE_SECRET_KEY: 'ssKPDunGPQMgibSaUKcExJ1wVqZBn',
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || 'luztaliYVKdBO33WHlvvKJJN2V2HvUbzsZauhTyq',
  SPARKPOST_API_KEY: process.env.SPARKPOST_API_KEY || 'f0fc532198804739ab000c0b69f61bca48360725',
  EMAIL_VERIFIER_HUNTER_KEY: process.env.EMAIL_VERIFIER_HUNTER_KEY || 'f51d6f20d747c6c98ef01aa74147ff7cd6ab0b85',
  S3_REGION: process.env.S3_REGION || 'ap-south-1', // singapore
  S3_SIGNATURE_VERSION: process.env.S3_SIGNATURE_VERSION || 'v4',
  SHA_KEY: 'pinnatipedappraisedclinginesschonchooedtangleberrytrimorphismungracefulshirk',
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY || 'mcYZj34*taxlrVo11G#o&fj2!SD3ix2^h9',
  PASSWORD_SALT: process.env.PASSWORD_SALT || 'MBWeDZvmak+QOuWYMsJQEi5ozj1+NTC1gjElKzGDM2GLDtFivKtaMpIewpLm+mUPiL0N+8P94Tv0yjYOGh85fNPAp9iCUFUmS+ZNiqZot7D9XXK00zdQa+UAnv8obezvgRbrwInXsfokOwK234S+cDHfuGYXwwQSBzqIiPrA8DM=',
  CLOUDAMQP_URL: process.env.CLOUDAMQP_URL || 'amqp://guest:guest@localhost:5672',
  DATABASE_URL: process.env.DATABASE_URL,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost/trade-mongo',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  SLACK_CHANNEL: process.env.SLACK_CHANNEL,
  ORDER_SLACK_CHANNEL: process.env.ORDER_SLACK_CHANNEL,
  EXCHANGE_RATE_URL:  process.env.EXCHANGE_RATE_URL,
  EXCHANGE_RATE_API_KEY: process.env.EXCHANGE_RATE_API_KEY,
  GSTIN: '06AAACQ4803C1ZZ',
  GST_RATE: 18, // GST rate
  /* Razorpay id & sec */
  PAYMENT_GATEWAY_KEY_ID: process.env.PAYMENT_GATEWAY_KEY_ID || 'rzp_test_5njglxyaay3EaH',
  PAYMENT_GATEWAY_KEY_SECRET: process.env.PAYMENT_GATEWAY_KEY_SECRET || '9IeP80viJp3FfclcE8HwiuLB',
  /*---- end -------*/
  PAYU_MONEY: {
    MERCHANT_KEY: '0vzYv2ku',
    SALT: 'kqdsGZ3Slr',
    MERCHANT_ID: '5858428',
  },
  logLocation: path.join(__dirname, '../logs/'),
  PLIVO: {
    AUTH_ID: 'MANZGZNZK5MTDJNTKWOD',
    AUTH_TOKEN: 'ZTM3YTRjNDA1OGM1OGIyOWZjZjI5M2M5OTE2NGJi',
    SENDER_PHONE_NO: '+918296842568'
  },
  SMTP_CONFIG: {
    HOST: 'smtp.zoho.com',
    PORT: 465,
    AUTH: {
      user: 'no-reply@coinmint.in',
      pass: '12345678'
    },
  },
  SERVER_ACCOUNT: {
    userId: '1478766d-06d7-4b98-b40d-1e6770796186',
    email: 'hello@coinmint.in',
    fullName: 'SuperAdmin',
    phone: '8296842568',
    password: 'y3$3rv3rk@P@$$w0rdH@1',
    kycVerified: 'UNVERIFIED',
    isVerified: true,
    joined: Date.now(),
    isAdmin: true,
  },
  RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY,
  // PAYMENT GATEWAY
  CASHFREE_PAYMENT_GATEWAY: {
    TEST: {
      baseUrl: 'https://test.cashfree.com',
      appId: '1708410682e28d2455953d90148071',
      secretKey: 'd22947aecb1d63acb8b411c4c303154125f1636b',
    },
    PRODUCTION: {
      baseUrl: 'https://api.cashfree.com',
      appId: '52607f04c518d7a3efede6d5870625',
      secretKey: '1a839fa03b9fc95273d7da95a2d5c248dfe05c5c',
    },
  },
  CASHFREE_AUTO_COLLECT: {
    TEST: {
      baseUrl: 'https://cac-gamma.cashfree.com',
      xClientId: 'CF17084BCQACDNG219UYU6',
      xClientSecret: '29a306e674eb127f8babb90180bacd1102ca6093',
    },
    PRODUCTION: {
      baseUrl: 'https://cac-api.cashfree.com',
      xClientId: process.env.CASHFREE_AUTOCOLLECT_CLIENTID,
      xClientSecret: process.env.CASHFREE_AUTOCOLLECT_CLIENTSECRET,
    }
  },
  CASHFREE_PAYOUT: {
    TEST: {
      baseUrl: 'https://payout-gamma.cashfree.com',
      clientId: 'CF17084E3R8PJFBT6I6AIE',
      clientSecret: 'f9068a8dca882628049d20a1dedc8e37dc24574e'
    },
    PRODUCTION: {
      baseUrl: 'https://payout-api.cashfree.com',
      clientId: process.env.CASHFREE_PAYOUT_CLIENTID,
      clientSecret: process.env.CASHFREE_PAYOUT_CLIENTSECRET,
    }
  },
  QUICKO : {
    API_KEY: 'key_live_Gu4sTwfttaOc0VDYg4aQ0tMvYnpL9bpE',
    API_SECRET: 'secret_live_aaHmlbjbZWpyzBSxEKZ6mdfq2fwKXMmc',
    BASE_URL: 'https://api.quicko.com'
  }
};

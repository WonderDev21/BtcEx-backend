const {RippleAPI} = require('ripple-lib');
const config = require('../config');

const rippleApi = new RippleAPI({
  server: config.RIPPLE_SERVER
});

exports.rippleApi = rippleApi;

const address = config.RIPPLE_ADDRESS;
// const address = 'rLdinLq5CJood9wdjY9ZCdgycK8KGevkUj';

exports.connectRipple = () => {
  rippleApi.connect().then(() => {
    rippleApi.connection.on('transaction', (ev) => {
      console.log(JSON.stringify(ev, null, 2));
    });
   rippleApi.connection.request({
     command: 'subscribe',
     accounts: [address],
   });
    rippleApi.getBalances(address).then(balances => {
      console.log(balances);
      // process.exit();
    });
    rippleApi.getTransactions(address, {limit: 1000})
      .then(transaction => {
        console.log(JSON.stringify(transaction));
      })
      .catch(err => {
        console.log('TXN Not found', err);
      });
      console.log('ripple connected..');
  }).catch(console.error);
};


const Web3 = require('web3');
const web3 = new Web3();

exports.connectWeb3 = (url) => {
(
    web3.setProvider(new web3.providers.HttpProvider(url || 'http://127.0.0.1:8545'))
);
};
exports.web3 = web3;

const bitcore = require('bitcore-lib');
// const Insight = require('bitcore-explorers').Insight;
const bitcoin = require('bitcoinjs-lib');
const BigNumber = require('bignumber.js');
const axios = require('axios');
const bigi = require('bigi');
// const explorer = new Insight('https://insight.bitpay.com');  // responsible for doing a Tx

const btcToSatosi = (btc) => new BigNumber(btc).times(new BigNumber('100000000')).toString();
const MIN_FEE = 0.00025;
const getUnspentUtxos = (address) => {
    const URL = 'https://insight.bitpay.com';
    return axios.post(URL+'/api/addrs/utxo', {addrs: address});
};
exports.transferBitcoin = async (data) => {
    /*
    return explorer.getUnspentUtxos(data.addrSender, (err, utxos) => {
        if (err) {
            console.log('error: ', err);
            return err;
        } else {
            console.log('unspent Tx. output', utxos);  // index of your Tx

            const tx = bitcore.Transaction();
            tx.from(utxos);  // tx is happening from this index
            tx.to(data.addrReceiver, data.amt); // 10000
            tx.change(data.addrSender);
            tx.fee(50000);

            tx.sign(data.secret);  // signing the Tx. with sender private key

            tx.serialize();

            explorer.broadcast(tx, (err, returnedTxId) => {
                if (err) {
                    console.log('error is:', err);
                    return err;
                } else {
                    console.log('successfully broadcast:', returnedTxId);
                    return returnedTxId;
                }
            });
        }
    });
    */
};

exports.getBtcRawTransaction = (btcAccount, receiver, value, fee = 0) => {
    const privateKey = new bitcore.PrivateKey(btcAccount.keyObject.wif);
    const tx = bitcore.Transaction();
    const txnFee = fee > MIN_FEE ? (fee / 2) : MIN_FEE;
    const txnFeeInSatoshi = btcToSatosi(txnFee);
    const withdrawalAmount = fee > MIN_FEE ? (Number(value) - fee) : (Number(value) - MIN_FEE);
    return getUnspentUtxos(btcAccount.address)
        .then(({data: utxos}) => {
            tx.from(utxos);  // tx is happening from this index
            tx.to(receiver, btcToSatosi(withdrawalAmount));
            tx.change(btcAccount.address);
            tx.fee(txnFeeInSatoshi);
            tx.sign(privateKey);  // signing the Tx. with sender private key
            return tx.toString();
        });
};

exports.createWallet = (userId) => {
    const hash = bitcoin.crypto.sha256(userId);
    const z = bigi.fromBuffer(hash);
    const keyPair = new bitcoin.ECPair(z);
    return {address: keyPair.getAddress(), wif: keyPair.toWIF()};
};

// const bitcore = require('bitcore-lib');
// const Insight = ()require('bitcore-explorers').Insight;
const bitcoin = require('bitcoinjs-lib');
const bigi = require('bigi');
const insight = {}; // new Insight('testnet');  // responsible for doing a Tx

exports.transferLiteCoin = async (data) => {
    return insight.getUnspentUtxos(data.addrSender, (err, utxos) => {
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


            insight.broadcast(tx, (err, returnedTxId) => {
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
};
exports.createWallet = (userId) => {
  // const rng = () => Buffer.from(userId);
  const litecoin = bitcoin.networks.litecoin;
  // const keyPair = bitcoin.ECPair.makeRandom({network: litecoin, rng: rng});
  // const wif = keyPair.toWIF();
  // const address = keyPair.getAddress();
  const hash = bitcoin.crypto.sha256(userId);
  const z = bigi.fromBuffer(hash);
  const keyPair = new bitcoin.ECPair(z, null, {network: litecoin});
  const wif = keyPair.toWIF(litecoin);
  const address = keyPair.getAddress(litecoin);
  return {address, wif};
};

const etherService = require('../services/ethereum.service');
const rippleService = require('../services/ripple.service');

const bitcoinService = require('../services/bitcoin.service');
const etherClassicService = require('../services/ethereum.classic.service');
// sudo geth --fast --rpc //

exports.createEtherWallet = async (req,res) => {
    try{
        const walletObject = await etherService.createEtherWallet(req.params.userId);
        res.status(200).send(walletObject);
    } catch(err){
        res.status(400).send(err);
    }
};

exports.getPrivateKey = async (req,res) => {
    try{
        console.log('Private Key Controller',req.body.password, req.body.keyObject);
        const privateKeyObject = await etherService.getPrivateKey(req.body.password, req.body.keyObject);
        console.log('Private Key Object', privateKeyObject);
        res.status(200).send(privateKeyObject);
    } catch(err){
        res.status(400).send(err);
    }
};

exports.transferEth = async (req,res) => {
    console.log('Ether Transafer: ');
    const sender = req.body.sender,
        receiver = req.body.receiver,
        userPrivateKey = req.body.privateKey,
        value = req.body.value;
    const transactionObject = await etherService.transferEth(sender, receiver, userPrivateKey, value);
    // console.log('Transafer Object: ',sender, receiver, userPrivateKey, value);
    res.status(200).send(transactionObject);
};

/**********************************************  Ripple  ***************************************************/
exports.transferRipple = async (req, res) => { // req should contain sender, payment, secret
    console.log('in controller...');
    const prepardPayment = await rippleService.preparePayment(req.body.sender, req.body.payment);
    console.log('prepared payment...');
    const signedTx = await rippleService.signTx(prepardPayment.txJSON, req.body.secret);
    console.log('signed tx...');
    const result = await rippleService.submitTx(signedTx.signedTransaction);
    console.log('prepared payment...');
    // const gotTx = await rippleService.getTx(signedTx.id);
    console.log('payment', prepardPayment);
    console.log('signedTx', signedTx);
    console.log('result', result);
    res.status(200).send(result);
};
exports.getRipples = async (req, res) => {
    const balance = await rippleService.getbalance(req.params.address);
    res.status(200).send(balance);
};
/**********************************************  Ripple  ***************************************************/

exports.transferBitcoin = async (req, res) => { // req should contain sender, payment, secret
    const addrSender = req.body.senderAddr;
    const addrReceiver = req.body.receiverAddr;
    const amt = req.body.amount;
    const secret = req.body.secret;
    const result = await bitcoinService.transferBitcoin({addrSender, addrReceiver, amt, secret});
    res.status(200).send(result);
};

exports.createEtherClassicWallet = async (req,res) => {
    console.log('Ethre Classic Controller: ');
    try {
        const walletObject = await etherClassicService.createEtherClassicWallet(req.params.userId);
        // console.log('Ethre Classic Wallet: ', walletObject);
        res.status(201).send(walletObject);
    } catch(err) {
        console.log('Error', err);
        res.status(400).send(err);
    }
};

exports.transferEtherClassic = async (req,res) => {
    console.log('Ether Classic Transafer: ');
    const sender = req.body.sender,
        receiver = req.body.receiver,
        userPrivateKey = req.body.privateKey,
        value = req.body.value;
    const transactionObject = await etherClassicService.transferEtherClassic(sender, receiver, userPrivateKey, value);
    console.log('Transafer Object: ',sender, receiver, userPrivateKey, value, transactionObject);
    res.status(201).send(transactionObject);
};

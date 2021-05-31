const _ = require('lodash');
const logger = require('winston');
const randomNatural = require('random-natural');

var {rippleApi} = require('../setup/ripple');
const config = require('../config/');
const Transaction = require('../models').models.Transaction;
const Account = require('../models').models.Account;
const {transactionStatus, allowedTypes, allowedModes} = require('../constants/tradeConstants');
const {objectToJSON} = require('../utils/jsonUtils');
const transactionService = require('./transaction.service');

rippleApi.connection._config.connectionTimeout = 3e4;

const MINIMUM_DEPOSIT = 1;

// const RIPPLE_FROM_ADDRESS = 'raX7cquLR7t95Ar9EWF6hg2vJcDN3opbKo'; // Balance 1,000 XRP
// const RIPPLE_FROM_SECRET = 'spxMffrMQe7RDk1Q1xt8yGBJTEfqp';

// const RIPPLE_TO_ADDRESS = 'r3jwUrcpQq1NQpH6QjP5RFXt8upL9MKTye'; // Balance 1,000 XRP
// const RIPPLE_TO_SECRET = 'spknSkmdW4dVVyoUdrw91Wv7vhL8P';

exports.preparePayment = async (sender, payment) => {
    return rippleApi.preparePayment(sender, payment); // sender = sender's public address && payment object
};

exports.signTx = async (txJSON, secret) => {
    return rippleApi.sign(txJSON, secret);  // preparedPayment.txJSON  && secret = sender's secret key
};

exports.submitTx = async (signedTx) => {
    return rippleApi.submit(signedTx);  // signedTransa.signedTransaction
};

exports.getTx = async (id) => {
    return rippleApi.getTransaction(id);  // signedTransa.id
};

exports.getbalance = async (address) => {
    return rippleApi.getBalances(address);  // signedTransa.id
};

// eslint-disable-next-line no-unused-vars
exports.createWallet = (userId) => rippleApi.generateAddress();

exports.getRippleTag = (refId) => {
    let tag = '';
    if (refId <= 999) { // 1000110 - 9999999
        const paddedRef = _.padStart(refId, 3, '0');
        tag = `${randomNatural({min: 10, max: 99})}${paddedRef}${randomNatural({min: 10, max: 99})}`;
    } else if (refId <= 9999) { // 10100010 - 99999999
        tag = `${randomNatural({min: 10, max: 99})}${refId}${randomNatural({min: 10, max: 99})}`;
    } else if (refId <= 99999) { // 101000010 - 999999999
        tag = `${randomNatural({min: 10, max: 99})}${refId}${randomNatural({min: 10, max: 99})}`;
    } else {// 1100000100 - 1xxxxxxx999
        tag = `1${refId}${randomNatural({min: 100, max: 999})}`;
    }
    return {address: config.RIPPLE_ADDRESS, tag};
};
// 6414QcC&TuZ9B0g
// address rBkKHhUJMJnnwmw6aeu4W1dBYNFL6vseoN
// ssKPDunGPQMgibSaUKcExJ1wVqZBn

// eslint-disable-next-line no-unused-vars
const getAccountInfo = async (address) => {
    return rippleApi.getAccountInfo(address);
};

// secret : snnvZ2sjvt5jMq2rvoGp4ZdPd2trJ
// address : r4GrdWgiGbRE2rMHTerqiEG5FeLGFLWohV

/**
 * @description Method to subscribe to ripple accounts
 * @param {array} address contains ripple addresses
 */

const subscribeRipple = (address) => {
    logger.info('<<<< ripple subscribed on >>>>', address);
    return rippleApi.connection.request({
        command: 'subscribe',
        accounts: address
    });
};

rippleApi.on('error', (errorCode, errorMessage) => {
    logger.error(errorCode + ': ' + errorMessage);
    process.exit(1);
});

rippleApi.on('connected', () => {
    logger.info('<< ripple connected >>');
});

rippleApi.on('disconnected', (code) => {
    logger.info('<< ripple disconnected >> code:', code);
    process.exit(1);
});


rippleApi.connect().then(() => {
    // subscribe to ripple account address
    subscribeRipple([config.RIPPLE_ADDRESS]);

    // event to listen transaction status after withdrawal and deposit
    // eslint-disable-next-line max-statements
    rippleApi.connection.on('transaction', async (result) => {
        try {
            const {transaction: {hash, Fee, Destination, DestinationTag, Amount}, engine_result} = result;
            const amount = (+Amount / (1000 * 1000));

            if (amount < MINIMUM_DEPOSIT) {
                logger.info('<<<<< Amount must be greater than 1 XRP >>>>>', amount, result);
                return;
            }

            logger.info('##### Transaction #####');
            logger.info(hash, Fee, engine_result, result);

            const status = engine_result === 'tesSUCCESS' ? transactionStatus.COMPLETE : transactionStatus.CANCELLED;

            // If destination and ripple address are equal that means it is a deposit entry, so create new transaction
            //  else it is a withdrawal entry and update the transaction entry.
            if (Destination === config.RIPPLE_ADDRESS) {
                const account = objectToJSON(await Account.findOne({where: {'keyObject.tag': DestinationTag}}));
                if (!account) {
                    logger.info('<<<<< Account not found for tag >>>>>', DestinationTag);
                    return;
                }
                const {userId} = account;
                let txn = await Transaction.find({where: {gatewayTransactionId: hash}});
                if (!txn) {
                    txn = await transactionService.newTransaction({
                        mode: allowedModes.OTHERS,
                        fee: Fee,
                        currency: 'XRP',
                        tag: DestinationTag,
                        address: Destination,
                        amount: amount,
                        type: allowedTypes.ADD_TO_PLATFORM,
                        userId: userId,
                        customerId: userId,
                        gatewayTransactionId: hash,
                    });
                } else {
                    txn = objectToJSON(txn);
                }

                await transactionService.updateUserTransaction({
                    transactionInfo: result,
                    status: status,
                    transactionId: txn.transactionId,
                    customerId: txn.customerId
                });
            } else {
                await Transaction.update({status: status, fee: Fee, transactionInfo: result}, {where: {gatewayTransactionId: hash}});
            }
        } catch (err) {
            logger.error(err);
        }
    });

    // rippleApi.getAccountInfo('r4GrdWgiGbRE2rMHTerqiEG5FeLGFLWohV').then(res => console.log('r4GrdWgiGbRE2rMHTerqiEG5FeLGFLWohV',res).catch(console.error));
    // rippleApi.getAccountInfo('rBkKHhUJMJnnwmw6aeu4W1dBYNFL6vseoN').then(res => console.log('rBkKHhUJMJnnwmw6aeu4W1dBYNFL6vseoN',res));
}).then(() => {
}).catch(logger.error);


/* TRANSACTION RESPOSE

{
   "engine_result":"tesSUCCESS",
   "engine_result_code":0,
   "engine_result_message":"The transaction was applied. Only final in a validated ledger.",
   "ledger_hash":"092D220136AFAAABB65928057FA9ABE40B959E32D8E13B69EF157E345F725E28",
   "ledger_index":55602406,
   "meta":{
      "AffectedNodes":[
         {
            "ModifiedNode":{
               "FinalFields":{
                  "Account":"rBkKHhUJMJnnwmw6aeu4W1dBYNFL6vseoN",
                  "Balance":"22839964",
                  "Flags":0,
                  "OwnerCount":0,
                  "Sequence":4
               },
               "LedgerEntryType":"AccountRoot",
               "LedgerIndex":"908E3E2238C777C1A7BD4AB4E226C070E140E3095BF4175B9171571CCB45B3FA",
               "PreviousFields":{
                  "Balance":"21839964"
               },
               "PreviousTxnID":"375A5C3E7C3747530C3664DAF82F2D40A055A9B19DD86363D98BEEDA19CF765C",
               "PreviousTxnLgrSeq":55602057
            }
         },
         {
            "ModifiedNode":{
               "FinalFields":{
                  "Account":"r4GrdWgiGbRE2rMHTerqiEG5FeLGFLWohV",
                  "Balance":"22899976",
                  "Flags":0,
                  "OwnerCount":0,
                  "Sequence":55558919
               },
               "LedgerEntryType":"AccountRoot",
               "LedgerIndex":"9272E2B277BA3C0DD6A7F47E001E59E61F85CC34CD84CE044CECA361427449D2",
               "PreviousFields":{
                  "Balance":"23899988",
                  "Sequence":55558918
               },
               "PreviousTxnID":"375A5C3E7C3747530C3664DAF82F2D40A055A9B19DD86363D98BEEDA19CF765C",
               "PreviousTxnLgrSeq":55602057
            }
         }
      ],
      "TransactionIndex":12,
      "TransactionResult":"tesSUCCESS",
      "delivered_amount":"1000000"
   },
   "status":"closed",
   "transaction":{
      "Account":"r4GrdWgiGbRE2rMHTerqiEG5FeLGFLWohV",
      "Amount":"1000000",
      "Destination":"rBkKHhUJMJnnwmw6aeu4W1dBYNFL6vseoN",
      "DestinationTag":203908106,
      "Fee":"12",
      "Sequence":55558918,
      "SigningPubKey":"02EC6A340B1ED773367572D8BF4107384E3E022AAF0A81EBC2A6E015B248874F97",
      "TransactionType":"Payment",
      "TxnSignature":"304402200CC17592ECD275B82B7E0ED2F3CCAE1CEC3CF05D377486FBA57FE873435944090220625AF992408927A2EE698FAB5DCCFA144F091C8EC9C7DB5504C91565D2331C10",
      "date":643350650,
      "hash":"EC18A414E22987B9F385F12A4E93D3E43E4E5853ED86E3021221075A3E91C350"
   },
   "type":"transaction",
   "validated":true
}

*/

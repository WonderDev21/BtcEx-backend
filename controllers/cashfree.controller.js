const _ = require('lodash');
const logger = require('winston');
const randomNatural = require('random-natural');

const {paymentGateway} = require('../gateways/cashfree/paymentgateway');
const {autoCollect} = require('../gateways/cashfree/autocollect');
const {verifyWebhookData} = require('../gateways/cashfree/payouts');
const {FIAT_CURRENCY} = require('../config');
const {validateBody, handleAutoCollectEvents, handlePayoutEvents} = require('../utils/cashfree.util');

// const Document = require('../models').models.Document;

const {getUserFullInfo} = require('../services/document.service');
const {createFiatAccount} = require('../services/account.service');
// const {newTransaction} = require('../services/transaction.service');

/**
 * @description Controllers for Cashfree Payment Gateway
 */

exports.createOrder = async (req, res) => {
  try {
    const requiredData = ['orderId', 'orderAmount', 'customerName', 'customerPhone', 'customerEmail', 'returnUrl'];
    const validateData = validateBody(requiredData, req.body);
    if (validateData.message) {
      res.status(422).send(validateData);
      return;
    }
    const order = await paymentGateway.createOrder(req.body);
    res.status(200).send(order);
  } catch (error) {
    logger.error(error.response.data);
    res.status(400).send(error.response.data);
  }
};

exports.orderInfoLink = async (req, res) => {
  try {
    const {orderId} = req.query;
    if (!orderId) {
      res.status(422).send({message: 'orderId is missing'});
      return;
    }
    const link = await paymentGateway.orderInfoLink({orderId});
    res.status(200).send(link);
  } catch (err) {
    logger.error(err.response.data);
    res.status(400).send(err.response.data);
  }
};

exports.orderInfo = async (req, res) => {
  try {
    const {orderId} = req.query;
    if (!orderId) {
      res.status(422).send({message: 'orderId is missing'});
      return;
    }
    const order = await paymentGateway.orderInfo({orderId});
    res.status(200).send(order);
  } catch (err) {
    logger.error(err.response.data);
    res.status(400).send(err.response.data);
  }
};

exports.orderStatus = async (req, res) => {
  try {
    const {orderId} = req.query;
    if (!orderId) {
      res.status(422).send({message: 'orderId is missing'});
      return;
    }
    const status = await paymentGateway.orderInfoStatus({orderId});
    res.status(200).send(status);
  } catch (err) {
    logger.error(err.response.data);
    res.status(400).send(err.response.data);
  }
};

exports.orderPaymentEmail = async (req, res) => {
  try {
    const {orderId} = req.query;
    if (!orderId) {
      res.status(422).send({message: 'orderId is missing!'});
      return;
    }
    const paymentEmail = await paymentGateway.orderEmail({orderId});
    res.status(200).send(paymentEmail);
  } catch (err) {
    logger.error(err.response.data);
    res.status(400).send(err.response.data);
  }
};

exports.orderRefund = async (req, res) => {
  try {
    const requiredData = ['referenceId', 'refundAmount', 'refundNote'];
    const validateData = validateBody(requiredData, req.body);
    if (validateData.message) {
      res.status(422).send(validateData);
      return;
    }
    const refund = await paymentGateway.orderRefund(req.body);
    res.status(200).send(refund);
  } catch (err) {
    logger.error(err.response.data);
    res.status(400).send(err.response.data);
  }
};

exports.getRefunds = async (req, res) => {
  try {
    const {startDate, endDate} = req.query;
    if (!startDate || !endDate) {
      res.status(422).send({message: 'start or end date is missing!'});
      return;
    }
    const refunds = await paymentGateway.refunds(req.query);
    res.status(200).send(refunds);
  } catch (err) {
    logger.error(err.response.data);
    res.status(400).send(err.response.data);
  }
};

exports.getRefund = async (req, res) => {
  try {
    const {refundId, merchantRefundId} = req.query;
    if (!refundId && !merchantRefundId) {
      res.status(422).send({message: 'refundId or merchantRefundId is missing!'});
      return;
    }
    const refund = await paymentGateway.refundDetails(req.query);
    res.status(200).send(refund);
  } catch (err) {
    logger.error(err.response.data);
    res.status(400).send(err.response.data);
  }
};

exports.getSettlements = async (req, res) => {
  try {
    const {startDate, endDate} = req.query;
    if (!startDate || !endDate) {
      res.status(422).send({message: 'start or end date is missing!'});
      return;
    }
    const settlements = await paymentGateway.settlements(req.query);
    res.status(200).send(settlements);
  } catch (err) {
    logger.error(err.response.data);
    res.status(400).send(err.response.data);
  }
};

exports.getSettlement = async (req, res) => {
  try {
    const {settlementId} = req.query;
    if (!settlementId) {
      res.status(422).send({message: 'settlementId is missing!'});
      return;
    }
    const settlement = await paymentGateway.settlement(req.query);
    res.status(200).send(settlement);
  } catch (err) {
    logger.error(err.response.data);
    res.status(400).send(err.response.data);
  }
};

/**
 * @description Controllers for Cashfree Auto Collect
 */

// eslint-disable-next-line max-statements
exports.createVA = async (req, res) => {
  try {
    const {userId} = req.body;
    const userInfo = await getUserFullInfo(userId);
    const {bankDetails, user: {fullName, refId, email, country}} = userInfo;
    logger.info('Create VA', bankDetails);
    if (country !== 'in') {
      const fiatWallet = {
        type: 'FIAT_WALLET',
        currency: FIAT_CURRENCY.USD,
        value: 0,
        userId
      };
      await createFiatAccount(fiatWallet);
      return res.status(400).send({message: 'Virtual account is only for Indian Users.'});
    }
    if (bankDetails.length === 0) {
      return res.status(400).send({message: 'Bank Detail is not available for this User.'});
    }
    const validation = await autoCollect.validateAuthToken();
    if (validation.subCode !== '200') {
      return res.status(400).send({message: validation.message});
    }
    const prefix = randomNatural({min: 100000000, max: 999999999});
    const vAccountId =  ''+refId.toString().padStart(5, `${prefix}`);
    const data = {
      vAccountId,
      name: fullName,
      phone: bankDetails[0].phone,
      email,
      remitterAccount: bankDetails[0].accountNumber,
      remitterIfsc: bankDetails[0].ifscCode
    };
    const newVA = await autoCollect.createVA(data);
    if (newVA.subCode === '200') {
      const fiatWallet = {
        type: 'FIAT_WALLET',
        currency: FIAT_CURRENCY.INR,
        value: 0,
        address: vAccountId,
        keyObject: newVA.data,
        userId
      };
      await createFiatAccount(fiatWallet);
    }
    res.status(200).send(newVA);
  } catch (err) {
    logger.error(err);
    res.status(400).send(err);
  }
};

exports.getAllVA = async (req, res) => {
  try {
    const validation = await autoCollect.validateAuthToken();
    if (validation.subCode !== '200') {
      throw new Error(validation.message);
    }
    const vas = await autoCollect.listAllVA(req.query);
    res.status(200).send(vas);
  } catch (err) {
    logger.error(err);
    res.status(400).send(err);
  }
};

/**
 * @description Payout Webhook Handlers.
 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 * +                                      PAYOUT WEBHOOK EVENTS                                              +
 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 * ​+ TRANSFER_SUCCESS​      => Transfer successful at the bank and account debited                            +
 * + TRANSFER_FAILED​       => Transfer failed                                                                +
 * + TRANSFER_REVERSED​     => Transfer reversed by the beneficiary bank                                      +
 * + CREDIT_CONFIRMATION​   => Confirmation of balance credit                                                 +
 * + TRANSFER_ACKNOWLEDGED​ => After the beneficiary bank has deposited the money it confirms the transfer.   +
 * + LOW_BALANCE_ALERT​     => Payouts recharge account low balance alert                                     +
 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 */

exports.payoutWebhook = async (req, res) => {
  try {
    logger.info('<<<<<<<<<<<<<<<<<<<<< CASHFREE PAYOUT WEBHOOK RESPONSE >>>>>>>>>>>>>>>>>>>>>>');
    logger.info(req.body);
    const isVerified = await verifyWebhookData(req.body);
    if (!isVerified) {
      res.status(400).send({message: 'Signature verification is failed!'});
      return;
    }
    const resp = await handlePayoutEvents(req.body);
    res.status(200).send(resp);
  } catch (err) {
    logger.error(err);
    res.status(400).send(err);
  }
};

/**
 * @description Auto collect Webhook Handlers.
 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 * |                                      AUTO COLLECT WEBHOOK EVENTS                                                                  |
 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 * ​| AMOUNT_COLLECTED      => Money has been received in your CashFree Virtual account through auto collect.                           |
 * | TRANSFER_REJECTED     => Transfer request was received, but has been rejected due to some reason (mentioned in the field reason)  |
 * | AMOUNT_SETTLED        => Settlement Notification for payments                                                                     |
 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 *
 * ====================================================================
 * |               AMOUNT_COLLECTED RESPONSE                          |
 * ====================================================================
 * | event:          	  AMOUNT_COLLECTED                              |
 * | amount:	          100                                           |
 * | vAccountId:	      BTCEX00006                                    |
 * | vAccountNumber:	  808081yk2dBTCEX00006                          |
 * | email:	            amrendra@mailinator.com                       |
 * | phone:	            9876543210                                    |
 * | referenceId:	      164628                                        |
 * | utr:	              78297474500715                                |
 * | creditRefNo:	      9444973056204613                              |
 * | remitterAccount:	  1234567890                                    |
 * | remitterIfsc:	    HDFC0000549                                   |
 * | remarks:	          NA                                            |
 * | remitterName:	    Cashfree                                      |
 * | paymentTime:	      2020-06-13 20:24:51                           |
 * | signature:	        7/3FWV2Jht9CIuIq30Nz0/jgooMuCuIu8aGRT0vLBo8=  |
 * ====================================================================
 */

exports.autoCollectWebhook = async (req, res) => {
  try {
    logger.info('<<<<<<<<<<<<<<<<<<<<< CASHFREE AUTO COLLECT WEBHOOK RESPONSE >>>>>>>>>>>>>>>>>>>>>>');
    logger.info(req.body);
    const isVerified = await autoCollect.verifySignature(req.body);
    if (!isVerified) {
      res.status(400).send({message: 'Signature verification is failed!'});
      return;
    }
    const resp = await handleAutoCollectEvents(req.body);
    res.status(200).send(resp);
  } catch (err) {
    logger.error(err);
    res.status(400).send(err);
  }
};

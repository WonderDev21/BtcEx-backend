/* eslint-disable new-cap */
const cfSdk = require('cashfree-sdk');

const appConstants = require('../../config/index');
const {NODE_ENV} = require('../../setup/env');

const {Payouts} = cfSdk;
const {Beneficiary, GetBalance, SelfWithdrawal, Validation, VerifySignature, Transfers} = Payouts;

const {PRODUCTION, TEST} = appConstants.CASHFREE_PAYOUT;
const {clientId, clientSecret} = NODE_ENV !== 'development' ? PRODUCTION : TEST;

Payouts.Init({
  ENV: NODE_ENV !== 'development' ? 'PRODUCTION' : 'TEST',
  ClientID: clientId,
  ClientSecret: clientSecret
});

exports.getBalance = async () => {
  const resp = await GetBalance();
  return resp;
};

/**
 * @param {Object} withdraw => { withdrawalId: string, amount: number, remarks?: string }
 */

exports.selfWithdrawal = async (withdraw) => {
  const resp = await SelfWithdrawal(withdraw);
  return resp;
};

/**
 * @param {Object} beneficiary => { beneId: string, name: string, email: string, phone: string, bankAccount: string, ifsc: string, address1: string, city: string, state: string, pincode: string }
 */

exports.addBeneficiary = async (beneficiary) => {
  const resp = await Beneficiary.Add(beneficiary);
  return resp;
};

/**
 * @param {Object} bank => { name: string, phone: string, bankAccount: string, ifsc: string }
 */

exports.verifyBankDetails = async (bank) => {
  const resp = await Validation.ValidateBankDetailsAsync(bank);
  return resp;
};

/**
 * @description To verify the webhook received from Cashfree for different events and accept the webhook only when it returns true
 */

exports.verifyWebhookData = async (webhookPostDataJson) => {
  const resp = await VerifySignature(webhookPostDataJson);
  return resp;
};

/**
 * @param {Object} data => { beneId: string, transferId: string, amount: string }
 */

exports.transferAmount = async (data) => {
  const resp = await Transfers.RequestAsyncTransfer(data);
  console.log(resp);
  return resp;
};

/*
  Dummy response of amount transfer.
  =================================================
  {
    status: 'ACCEPTED',
    subCode: '201',
    message: 'Transfer Initiated',
    data: { referenceId: '125127' }
  }

  WEBHOOK RESPONSE
  =================================================
  event:	TRANSFER_SUCCESS
  transferId:	tranfer001236
  referenceId:	125106
  eventTime:	2020-06-13 19:49:55
  utr:	1387420160907000256942
  signature:	0fJnjeO47ZgiJrGRsLDc+1onPtVSdvoRLXKzoDlU7Ng=
  */

// console.log(exports.transferAmount());


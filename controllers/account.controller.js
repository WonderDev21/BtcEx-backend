const Sequelize = require('sequelize');
const sequelize = require('../models');
const accountService = require('../services/account.service');
const logger = require('winston');
const _ = require('lodash');


exports.getAllAccounts = async (req, res) => {
  const offset = _.get(req, 'query.offset', 0);
  const accountId = _.get(req, 'query.id', null);
  const userId = _.get(req, 'query.userId', null);
  try {
    let accounts = [];
    if (accountId) {
      accounts = [await accountService.fetchAccountById(accountId)];
    } else if (userId) {
      accounts = await accountService.getAccountsByUserId(userId);
    } else {
      accounts = await accountService.getAllAccounts(offset);
    }
    res.status(200).send(accounts);
  } catch(err) {
    console.log(err);
    res.status(400).send(err);
  }
};

// eslint-disable-next-line max-statements
exports.convertCurrency = async (req, res) => {
  const srcCurrency = _.get(req, 'body.srcCurrency', 'USD');
  const destCurrency = _.get(req, 'body.destCurrency', 'USDT');
  const amount = _.get(req, 'body.amount', 0); // amount that you want to convert
  const conversionRate = _.get(req, 'body.conversionRate', 1); // conversion rate
  const conversionFee = _.get(req, 'body.conversionFee', 0); // conversion fee
  const userId = _.get(req, 'body.userId', null);
  try {
    if (!amount || !userId) {
      res.status(422).send({message: `Error converting ${amount} ${srcCurrency} to ${destCurrency}`});
      return;
    }
    const accounts = await accountService.getAccountsByUserId(userId);
    const source = accounts.find((account) => account.currency === srcCurrency);
    if (+amount > +source.value) {
      res.status(400).send({message: `Insufficient balance in ${srcCurrency} wallet.`});
      return;
    }
    const convertedAmount = +amount * +conversionRate * (1 - +conversionFee);
    return sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE})
      .then(async (t) => {
        try {
          const option = {remarks: `${srcCurrency}/${destCurrency} conversion`, beneficiary: userId};
          await accountService.debitBalance(userId, srcCurrency, +amount, t, option);
          await accountService.creditBalance(userId, destCurrency, +convertedAmount, t, option);
          t.commit();
          return res.status(200).send({message: `Converted ${amount} ${srcCurrency} to ${convertedAmount} ${destCurrency}!`});
        } catch(err2) {
          t.rollback();
          res.status(400).send(err2);
        }
    });
  } catch(err) {
    console.log(err);
    res.status(400).send(err);
  }
};

/*
exports.creditBalance = async (req, res) => {
  try {
    const userId = req.body.userId;
    const currency = req.body.currency;
    // first condi. will be true when admin will make request
    const value= req.body.updateBalance && req.body.updateBalance > 0 ? req.body.updateBalance : req.body.value;
    const updatedBalance = await accountService.creditBalance(userId, currency, value);
    res.status(200).send(updatedBalance);
  } catch(error) {
    res.status(400).send(error);
  }
}

exports.debitBalance = async (req, res) => {
  try {
    const userId = req.body.userId;
    const currency = req.body.currency;
    // first condi. will be true when admin will make request
    const value= req.body.updateBalance && req.body.updateBalance > 0 ? req.body.updateBalance : req.body.value;
    const updatedBalance = await accountService.debitBalance(userId, currency, value);
    res.status(200).send(updatedBalance);
  } catch(error) {
    res.status(400).send(error);
  }
}

exports.transferBalance = async (req, res) => {
  try{
    const account1 = req.body.account1,
      account2 = req.body.account2,
      currency = req.body.currency,
      value = req.body.value;
    const transferBalanceResponse = await accountService.transferBalance({ account1, account2, currency, value });
    res.status(200).send(transferBalanceResponse);
} catch(error) {
    res.status(400).send(error);
  }
}
*/

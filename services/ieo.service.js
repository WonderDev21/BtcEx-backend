const logger = require('winston');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const sequelize = require('../models');
const Sequelize = require('sequelize');
const User = require('../models').models.User;
const Ieoproject = require('../models').models.Ieoproject;
const IeoSale = require('../models').models.IeoSale;
const emailService = require('./email.service');
const accountService = require('./account.service');
const redisService = require('./redis.service');
const orderService = require('./order.service');
const {objectToJSON, arrayToJSON} = require('../utils/jsonUtils');
const ieoUtils = require('../utils/ieo.utils');
const {verificationStatus} = require('../constants/userConstants');
const {verificationEmailOptions} = require('../constants/serverConstants');
const sendAdminNotification = require('../deployments/postMessage.js');
const channel = require('../setup/channel.js');
const {channelNames} = require('../constants/channelConstants');
const {MessageTypes} = require('../constants/slackConstants.js');
const globalQueue = channel.getChannel(channelNames.TRADE);
const {APP_URL, APP_NAME, SUPPORT_EMAIL, SERVER_ACCOUNT} = require('../config');
const serverAccountId = SERVER_ACCOUNT.userId;

const getAllIEOPurchases = async(token) => {
  const sold = await IeoSale.sum('size', {where: {token}});
  return sold;
};
exports.getAllIEOPurchases = getAllIEOPurchases;

exports.getAllIEOProjects = async () => {
  return arrayToJSON(await Ieoproject.findAll({order: [['createdAt', 'DESC']]}));
};
exports.getIEOProject = async (slug) => {
  const ieoProject = objectToJSON(await Ieoproject.find({
    where: {slug}
  }));
  if(ieoProject) {
    const sold = await getAllIEOPurchases(ieoProject.symbol);
    return {...ieoProject, sold};
  }
  return null;
};
exports.addIEOProject = async(project) => {
  const ieoProject = objectToJSON (await Ieoproject.create(project));
  return ieoProject;
};
exports.updateIEOProject = async(slug, project) => {
  const ieoProject = await Ieoproject.update(project,
    {
      where: {slug}
    });
    return objectToJSON(ieoProject[1]);
};

exports.addNewIEOSale = async(user, slug, saleObj) => {
  return sequelize.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE})
  .then(async (t) => {
    try {
      const userId = user.userId;
      const ieoProject = await exports.getIEOProject(slug);
      if (ieoProject.status !== 'ACTIVE') {
        await t.rollback();
        return {success: false, message: 'IEO Sale not active'};
      }
      const rates = await orderService.getCurrencyBestSellers();
      const sale = ieoUtils.calculateIEOAmount(ieoProject, rates, saleObj);
      if(!sale.success) {
        await t.rollback();
        return sale;
      }
      const userAccount = await accountService.checkBalance(userId, saleObj.purchaseCurrency, sale.amount);
      if(!userAccount.isEligible) {
        await t.rollback();
        return {success: false, message: 'Not enough acccount balance'};
      }
      const option1 = {
        remarks: `${ieoProject.symbol} IEO Purchase`,
        beneficiary: serverAccountId
      };
      const option2 = {
        remarks: `${ieoProject.symbol} IEO Purchase`,
        beneficiary: userId
      };
      const newOrExistingIEOAccount = await accountService.createIEOAccount(userId, ieoProject.symbol, t);
      const newOrExistingServerIEOAccount = await accountService.createIEOAccount(serverAccountId, ieoProject.symbol, t);
      const debitedExchangeWallet = await accountService.debitBalance(userId, saleObj.purchaseCurrency, sale.amount, t, option1);
      const creditServerExchangeWallet = await accountService.creditBalance(serverAccountId, saleObj.purchaseCurrency, sale.amount, t, option2);
      const creditIEOWallet = await accountService.creditBalance(userId, ieoProject.symbol, saleObj.size, t, option1);
      const debitServerIEOWallet = await accountService.debitBalance(serverAccountId, ieoProject.symbol, saleObj.size, t, option2);

      const ieoSaleObj = _.assign({
        coinId: ieoProject.coinId,
        discountPercent: sale.discount,
        size: saleObj.size,
        rate: ieoProject.unitPrice,
        totalAmt: sale.amount,
        currency: saleObj.purchaseCurrency,
        token: ieoProject.symbol,
        projectId: ieoProject.projectId,
        userId
      }, saleObj, sale);
      const ieosale = await IeoSale.create(ieoSaleObj, {transaction: t});
      logger.info('IEO Purchase successful');
      await t.commit();
      const sold = await getAllIEOPurchases(ieoProject.symbol);
      await redisService.setValue(`IEO_SALE_${ieoProject.symbol}`, sold);
      globalQueue.sendIEOPurchaseNotification({sold, token: ieoProject.symbol});
      sendAdminNotification(MessageTypes.IEO_SALE_UPDATE, {email: user.email, size: saleObj.size, token: ieoProject.symbol});
      const ieoOrderMail = fs.readFileSync(path.join(process.cwd(), 'mailer/output/ieoTokenPurchase.html'));
      const compiled = _.template(ieoOrderMail);
      const emailOutput = compiled({
        APP_URL,
        APP_NAME,
        SUPPORT_EMAIL,
        fullName: user.fullName,
        TOKEN_UNITS: Number(ieosale.size),
        TOKEN_CURRENCY: ieoProject.symbol,
        DISCOUNT: `${ieosale.discountPercent}%`,
        TOKEN_RATE: `${Number(ieosale.totalAmt / ieosale.size).toFixed(8)} ${ieosale.currency} per ${ieoProject.symbol}`,
        ORDER_TIME: moment(ieosale.createdAt).format('lll'),
        TOTAL_AMOUNT: `${ieosale.totalAmt} ${saleObj.purchaseCurrency}`,
      });
      const emailObject = {
        from: verificationEmailOptions.senderEmail,
        to: user.email,
        subject: `${ieoProject.symbol} Token Purchased`,
        html: emailOutput,
      };
      emailService.sendEmail(emailObject);
      return {success: true, message: 'Purchase successful', sale: ieosale};
    } catch(err) {
      await t.rollback();
      logger.info('Some error in IEO Sale', err);
      return;
    }
  });
};

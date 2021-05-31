
const logger = require('winston');
const _ = require('lodash');
const Hashids = require('hashids/cjs');
const Document = require('../models').models.Document;
const User = require('../models').models.User;
const {verificationStatus} = require('../constants/userConstants');
const userService = require('./user.service');
const {objectToJSON} = require('../utils/jsonUtils');
const s3Service = require('../services/s3.service');
const jobApi = require('../api/jobapi');
const config = require('../config');
const {MessageTypes} = require('../constants/slackConstants.js');
const sendAdminNotification = require('../deployments/postMessage.js');

const {addBeneficiary, verifyBankDetails} = require('../gateways/cashfree/payouts');
const hashids = new Hashids(config.HASHID_SALT, 15);

exports.addUserKYCInformation = async (userId, urls, kycInfo, userObj) => {
  let newDocument = null;
  try {
    const document = await Document.findOne({where: {userId: userId}});
    let addedToJob = false;
    if (document) {
      newDocument = await document.update({
        identity: urls[0] ? urls[0] : document.identity,
        address: urls[1] ? urls[1] : document.address,
        photo: urls[2] ? urls[2] : document.photo,
        signature: urls[3] ? urls[3] : document.signature,
        idProof: kycInfo.idProof ? kycInfo.idProof : document.idProof,
        addressProof: kycInfo.addressProof ? kycInfo.addressProof : document.addressProof,
        panNumber: _.get(kycInfo, 'idProof.panNumber', document.panNumber),
        aadharNumber: _.get(kycInfo, 'addressProof.aadharNumber', document.aadharNumber),
        bankDetails: [kycInfo.bankDetails],
        otherDetails: kycInfo.otherDetails ? kycInfo.otherDetails : document.otherDetails
      });
      const jobServerUser = {
        serverUserId: userId,
        name: `${kycInfo.idProof.firstName} ${_.get(kycInfo, 'idProof.middleName', '')} ${kycInfo.idProof.lastName}`,
        account_ifsc: kycInfo.bankDetails.ifscCode,
        account_number: kycInfo.bankDetails.bankAccountNumber,
        account_beneficiary_name: kycInfo.bankDetails.bankAccountHolderName,
        account_type: kycInfo.bankDetails.accountType,
        bank_name: kycInfo.bankDetails.bankName,
        bank_branch: kycInfo.bankDetails.bankBranch,
        email: userObj.email,
        phone: kycInfo.addressProof.phone
      };
      await jobApi.updateAccount(jobServerUser);
      logger.info('KYC Document updated!!');
    } else {
      newDocument = await Document.create({
        userId: userId,
        identity: urls[0] && urls[0],
        address: urls[1] && urls[1],
        photo: urls[2] && urls[2],
        signature: urls[3] && urls[3],
        idProof: kycInfo.idProof,
        addressProof: kycInfo.addressProof,
        panNumber: _.get(kycInfo, 'idProof.panNumber', ''),
        aadharNumber: _.get(kycInfo, 'addressProof.aadharNumber', ''),
        bankDetails: [kycInfo.bankDetails],
        otherDetails: kycInfo.otherDetails
      });
      const jobServerUser = {
        serverUserId: userId,
        name: `${kycInfo.idProof.firstName} ${_.get(kycInfo, 'idProof.middleName', '')} ${kycInfo.idProof.lastName}`,
        account_ifsc: kycInfo.bankDetails.ifscCode,
        account_number: kycInfo.bankDetails.bankAccountNumber,
        account_beneficiary_name: kycInfo.bankDetails.bankAccountHolderName,
        account_type: kycInfo.bankDetails.accountType,
        bank_name: kycInfo.bankDetails.bankName,
        bank_branch: kycInfo.bankDetails.bankBranch,
        email: userObj.email,
        phone: kycInfo.addressProof.phone
      };
      const jobAccount = await jobApi.createAccount(jobServerUser);
      if (jobAccount._id) {
        addedToJob = true;
        const jobObj = _.pick(jobAccount, ['id', 'virtual_account_number', 'virtual_account_ifsc']);
        const updatedUser = await User.update({jobServer: jobObj}, {where: {userId}});
      }
      logger.info('New KYC Document Saved!!');
    }
    const updatedUser = await userService.updateUser({userId: userId, kycVerified: verificationStatus.PENDING});
    sendAdminNotification(MessageTypes.USER_KYC_SUBMITTED, {addedToJob: addedToJob || 'N/A', email: updatedUser.email});
    logger.info('KYC documents submitted for user ' + updatedUser.email);
    return newDocument.get({plain: true});
  } catch(error) {
    logger.info('Error while submittting KYC for user', error);
    return error;
  }
};

exports.getDocumentByUserId = async userId => {
  logger.info(`Requesting User Document for userId: ${userId}`);
  const doc = objectToJSON(await Document.find({where: {userId: userId}}));
  const userObj = objectToJSON(await User.find({attributes: ['fullName'], where: {userId: userId}}));
  const keysArr = ['identity', 'address', 'signature', 'photo', 'idProof', 'addressProof', 'otherDetails', 'bankDetails'];
  const dupNameCount = await User.count({where: {fullName: userObj.fullName}});
  doc['dupCount'] = dupNameCount;
  const urlObject = _.pick(doc, keysArr);
  const promiseArr = [], foundKeys = [];
  for (let i=0; i < keysArr.length; i++) {
    if (keysArr[i] === 'idProof' || keysArr[i] === 'addressProof' || keysArr[i] === 'bankDetails' || keysArr[i] === 'otherDetails') {
      if (urlObject[keysArr[i]]) {
        Object.keys(urlObject[keysArr[i]]).forEach((key) => {
          const fileName = String(urlObject[keysArr[i]][key]).split(config.S3_BUCKET_NAME+'/')[1];
          if (fileName) {
            urlObject[keysArr[i]][key] && promiseArr.push(s3Service.getFileUrl(config.S3_BUCKET_NAME, fileName));
          }
        });
      }
    } else {
      const fileName = String(urlObject[keysArr[i]]).split(config.S3_BUCKET_NAME+'/')[1];
      urlObject[keysArr[i]] && promiseArr.push(s3Service.getFileUrl(config.S3_BUCKET_NAME, fileName));
    }
  }
  const resp = await Promise.all(promiseArr);
  for(let i=0, j=0; i < keysArr.length; i++) {
    if (keysArr[i] === 'idProof' || keysArr[i] === 'addressProof' || keysArr[i] === 'bankDetails' || keysArr[i] === 'otherDetails') {
      if (urlObject[keysArr[i]]) {
        Object.keys(urlObject[keysArr[i]]).forEach((key) => {
          doc[keysArr[i]][key] = urlObject[keysArr[i]][key] ? resp[j++] : undefined;
        });
      }
    } else {
      doc[keysArr[i]] = urlObject[keysArr[i]] ? resp[j++] : undefined;
    }
  }
  logger.info(`User Document retrived for userId: ${userId}`);
  return doc;
};

exports.getUserbankDetails = async userId => {
  logger.info(`Requesting User Bank Details for userId: ${userId}`);
  const doc = objectToJSON(await Document.find({attributes: ['bankDetails'], where: {userId: userId}}));
  return doc;
};

exports.getUserInfo = async (userId) => {
  logger.info(`Requesting User Docs for userId: ${userId}`);
  const user = await Document.find({
    where: {userId},
    include: [{
      model: User, as: 'user',
    }],
  });
  const data = _.pick(user, ['addressProof', 'userId', 'panNumber', 'idProof.panNumber', 'user.fullName', 'user.email', 'user.phone', 'user.customerId']);
  return data;
};

exports.getUserFullInfo = async (userId) => {
  logger.info(`Requesting User Docs for userId: ${userId}`);
  const user = await Document.find({
    where: {userId},
    include: [{
      model: User, as: 'user',
    }],
  });
  return user;
};

// exports.updateImage = (userId, url) => new Promise((resolve, reject) => {
//     console.log('entering to doc service');
//   Document.find({
//       where: {
//           userId: userId
//         }
//     }).then((doc) => {
//         console.log('find doc, will be uploaded..');
//         doc.updateAttributes({
//         idProof: url
//         }).then((updatedDoc) => {
//             console.log('uploaded....');
//              resolve(updatedDoc && updatedDoc.get({plain: true}));
//            })
//           .catch((error) => {
//               console.log('not uploaded...');
//              reject(error);
//         });
//      })
//     .catch((error) => {
//         reject(error);
//     });
// });

const verifyAndBeneficiary = async (reqBody) => {
  try {
    const {fullName, email, bankDetails} = reqBody;
    const bank = {
      name: fullName,
      phone: bankDetails.phone,
      bankAccount: bankDetails.accountNumber,
      ifsc: bankDetails.ifscCode
    };
    const bankVerified = await verifyBankDetails(bank);
    logger.info('Bank verified -> ', bank, bankVerified);
    // eslint-disable-next-line max-depth
    if (bankVerified.subCode === '200') {
      const beneficiary = {
        beneId: `BTCEX${Date.now()}`,
        name: fullName,
        email,
        phone: bankDetails.phone,
        bankAccount: bankDetails.accountNumber,
        ifsc: bankDetails.ifscCode,
        address1: bankDetails.address,
        city: bankDetails.city,
        state: bankDetails.state,
        pincode: bankDetails.pincode
      };
      logger.info('BENE >>>>>', beneficiary);
      const beneResp = await addBeneficiary(beneficiary);
      logger.info(beneResp);
      return beneficiary.beneId;
    }
  } catch (err) {
    logger.error(err);
  }
};

// eslint-disable-next-line max-statements
exports.saveIndianBankDetail = async (userId, bankDetails) => {
  try {
    const {country} = bankDetails;
    const document = await Document.findOne({where: {userId: userId}});
    const user = await User.findOne({where: {userId: userId}});
    const data = {
      fullName: user.fullName,
      email: user.email,
      bankDetails
    };
    if (document) {
      const updateData = {};
      if (country === 'in') {
        const beneId = await verifyAndBeneficiary(data);
        bankDetails.beneId = beneId;
        updateData.bankDetails = [bankDetails];
      }
      newDocument = await document.update(updateData);
      logger.info('KYC Document updated!!');
    } else {
      const createData = {userId: userId};
      if (country === 'in') {
        const beneId = await verifyAndBeneficiary(data);
        bankDetails.beneId = beneId;
        createData.bankDetails = [bankDetails];
      }
      newDocument = await Document.create(createData);
      logger.info('New KYC Document Saved!!');
    }
    await user.update({country: bankDetails.country});
  } catch (err) {
    logger.error(err);
  }
};

exports.saveUserData = (userId, userData) => {
  return new Promise((resolve, reject) => {
    Document.findOrCreate({
      where: {userId: userId},
      defaults: userData
    }).spread((user, created) => {
        if(created) {
          resolve(user.get({plain: true}));
        } else {
          user.update(userData)
          .then(resolve)
          .catch(reject);
        }
      });
  });
};

// eslint-disable-next-line max-statements
exports.saveUserKYC = async (reqBody) => {
  const {idProof, userId, selfieUrl, countryCode, bankDetails} = reqBody;
  let newDocument = null;
  try {
    const document = await Document.findOne({where: {userId: userId}});
    let addedToJob = false;
    if (document) {
      const updateData = {photo: selfieUrl ? selfieUrl : document.photo, idProof: idProof ? idProof : document.idProof};
      if (countryCode === 'in') {
        const beneId = await verifyAndBeneficiary(reqBody);
        bankDetails.beneId = beneId;
        updateData.panNumber = bankDetails.pancard;
        updateData.bankDetails = [bankDetails];
      }
      newDocument = await document.update(updateData);
      logger.info('KYC Document updated!!');
    } else {
      const createData = {userId: userId, photo: selfieUrl, idProof: idProof};
      if (countryCode === 'in') {
        const beneId = await verifyAndBeneficiary(reqBody);
        bankDetails.beneId = beneId;
        createData.panNumber = bankDetails.pancard;
        createData.bankDetails = [bankDetails];
      }
      newDocument = await Document.create(createData);
      logger.info('New KYC Document Saved!!');
    }
    const user = await User.findOne({where: {userId}});
    await userService.updateUser({userId: userId, kycVerified: verificationStatus.PENDING, country: countryCode});
    sendAdminNotification(MessageTypes.USER_KYC_SUBMITTED, {addedToJob: addedToJob || 'N/A', email: user.email});
    logger.info('KYC documents submitted for user ' + user.email);
    return newDocument.get({plain: true});
  } catch(error) {
    logger.info('Error while submittting KYC for user', error);
    return error;
  }
};

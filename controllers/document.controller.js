const documentService = require('../services/document.service');
const s3Service = require('../services/s3.service');
const logger = require('winston');
const _ = require('lodash');
const path = require('path');
const AppConfig = require('../config');

exports.submitKYC = async (request, response) => {
  const files = request.files;
  const kycDetails = JSON.parse(_.get(request, 'body.json', {}));
  const promiseArr = [];
  const userObj = request.user;
  const userId = request.params.userId;
  const timeStamp = Date.now();
  files.forEach((file) => {
    const absPath = path.resolve(process.cwd(), file.path);
    const originalFileName = file.originalname;
    const fieldName = file.fieldname;
    const fileName = `${userId}/kyc/${fieldName}-${timeStamp}-${originalFileName}`;
    promiseArr.push(s3Service.uploadFile(AppConfig.S3_BUCKET_NAME, fileName, absPath));
  });
  try {
    const results = await Promise.all(promiseArr);
    const urls = results.map(result => result.location);
    logger.info('Files uploaded to s3');
    try {
        const updatedDocument = await documentService.addUserKYCInformation(userId, urls, kycDetails, userObj);
        logger.info('uploaded files url saved to db');
        response.status(201).send({message: 'Success'});
      } catch(error) {
        logger.info(`files url saving failed  ${error}`);
        response.status(422).send(error);
      }
  } catch(err) {
    logger.info(`image upload failed  ${err}`);
    response.status(422).send(err);
  }
};

exports.getDocumentByUserId = async (request, response) => {
  const userId = _.get(request, 'params.userId');
  try {
    logger.info('User Document Request: ', userId);
    const userDoc = await documentService.getDocumentByUserId(userId);
    response.status(200).send(userDoc);
  } catch(err) {
    logger.error('User Document Request Error: ', err);
    response.status(400).send(err);
  }
};
exports.submitUserData = async function(request, response) {
  const userData = request.body;
  const userObj = request.user;
  const userId = userObj.userId;
  try {
    let resp;
    if (userData.country === 'in') {
      resp = await documentService.saveIndianBankDetail(userId, userData);
    } else {
      resp = await documentService.saveUserData(userId, userData);
    }
    response.status(200).send(resp);
  } catch(err) {
    response.status(422).send(err);
  }
};

exports.uploadDocument = async (request, response) => {
  const file = request.files[0];
  const userObj = request.user;
  const userId = userObj.userId;
  const timeStamp = Date.now();
  const absPath = path.resolve(process.cwd(), file.path);
  const originalFileName = file.originalname;
  const fieldName = file.fieldname;
  const fileName = `${userId}/files/${fieldName}-${timeStamp}-${originalFileName}`;
  try {
    const result = await s3Service.uploadFile(AppConfig.S3_BUCKET_NAME, fileName, absPath);
    const url = result.location;
    logger.info('Files uploaded to s3');
    response.status(200).send({message: 'Success', url});
  } catch(err) {
    logger.info(`image upload failed  ${err}`);
    response.status(422).send(err);
  }
};

exports.saveKYC = async (request, response) => {
  const {idProof, userId, selfieUrl, countryCode } = request.body;
  if (!idProof || !userId || !selfieUrl || userId === '' || selfieUrl === '' || !countryCode) {
    response.status(400).send({message: 'Some parameters are missing!'});
    return;
  }
  try {
    const resp = await documentService.saveUserKYC(request.body);
    response.status(200).send(resp);
  } catch(err) {
    response.status(422).send(err);
  }
};

const _ = require('lodash');
const logger = require('winston');
const path = require('path');
const AppConfig = require('../config');
const Request = require('../models').models.Request;
const User = require('../models').models.User;
const {objectToJSON, arrayToJSON} = require('../utils/jsonUtils');
const shortid = require('shortid');
const {MessageTypes} = require('../constants/slackConstants.js');
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@');
const sendAdminNotification = require('../deployments/postMessage.js');

const s3Service = require('../services/s3.service');

exports.createRequest = async (req, res) => {
  const file = req.files[0]; // receipt file
  const jsonData = JSON.parse(_.get(req, 'body.json', {}));
  const absPath = path.resolve(process.cwd(), file.path);
  const originalFileName = file.originalname;
  const fieldName = file.fieldname;
  const fileName = `${req.params.userId}/receipts/${fieldName}-${Date.now()}-${originalFileName}`;
  let result = null;
  try {
    result = await s3Service.uploadFile(AppConfig.S3_BUCKET_NAME, fileName, absPath);
    logger.info('Receipt uploaded to s3', result.location);
  } catch(err) {
    logger.error('Receipt upload error to s3', err);
  }
  const requestDetails = {
      receipt: result && result.location,
      mode: jsonData.transferType,
      currency: jsonData.currency,
      bankName: jsonData.bankName,
      address: jsonData.address,
      transactionNo: jsonData.txnRef,
      remarks: jsonData.message,
      amount: jsonData.amount,
      userId: req.params.userId,
      refNo: 'Req-'+shortid.generate(),
  };
  const userObj = req.user;
  try {
    const request = await Request.create(requestDetails);
    sendAdminNotification(MessageTypes.USER_DEPOSIT_REQUEST, {amount: `${req.body.amount} ${req.body.currency}`, name: userObj.fullName, email: userObj.email});
    res.status(200).send(objectToJSON(request));
  } catch(error) {
    res.status(400).send({message: 'Failed to deposit request', error: error && error.message});
  }
};

exports.updateRequest = async(req, res) =>  {
  try {
    const updatedRequest = await Request.update({status: req.body.status}, {
      where: {requestId: req.params.requestId},
      returning: true, plain: true
    });
    res.status(200).send(objectToJSON(updatedRequest[1]));
  } catch(error) {
    res.status(400).send({message: 'Error updating request', error});
  }
};
exports.getUserRequests = async (req, res) => {
  const offset = _.get(req, 'query.offset', 0);
  const userId = req.params.userId;
  try {
    const requests = arrayToJSON(await Request.findAll({
      attributes: ['createdAt', 'amount', 'userId', 'status', 'currency', 'refNo', 'remarks'],
      where: {userId},
      order: [['createdAt', 'DESC']],
      offset: offset,
      limit: 10
    }));
    res.status(200).send(requests);
  } catch(error) {
    res.status(400).send(error);
  }
};
exports.getAllRequests = async (req, res) => { // only admin access
  try {
    const requests = arrayToJSON(await Request.findAll({
      include: [{model: User, as: 'user', attributes: ['fullName', 'phone', 'email', 'customerId']}],
      order: [['updatedAt', 'DESC']]
    }));
    res.status(200).send(requests);
  } catch(error) {
    res.status(400).send(error);
  }
};

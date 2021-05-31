const _ = require('lodash');
const logger = require('winston');
const isValidRequest = (req, res, next) => {
  console.log(req.headers);
  console.log(req.cookies);
  next();
};
module.exports = isValidRequest;

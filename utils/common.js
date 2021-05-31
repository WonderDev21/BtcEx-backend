const appConstant = require('../config/index');
const request = require('axios');

exports.verifyCaptcha = async (captcha) => {
  const secret = appConstant.RECAPTCHA_SECRET_KEY;
  const reqOptions = {
    method: 'POST',
    url: `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${captcha}`,
  };
  const resp = await request(reqOptions);
  return resp.data;
};

/**
 * @description To generate codes
 * @author Amrendra Nath
 * @param {number} numberOfCode number of code you want to generate
 * @param {number} lengthOfCode length of the code
 * @returns {string[]} codes
 */

exports.generateCode = (numberOfCode, lengthOfCode) => {
  const codes = [];
  for (let num = 0; num < numberOfCode; num++) {
    codes.push(('' + Math.random()).substring(2, lengthOfCode + 2));
  }
  return codes;
};

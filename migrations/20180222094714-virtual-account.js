'use strict';
const _ = require('lodash');
const config = require('../config');
const Request = require('axios');
const crypto = require('crypto');

const secret = config.JOB_SECRET;
const genHash = function() {
  const time = String(parseInt(Date.now()/1000) * 1000);
  const hash = crypto.createHmac('sha256', secret).update(time).digest('base64');
  const obj = {msg_mac: hash, tc: time};
  return JSON.stringify(obj);
};
const jobApi = (data) => {
  const url = `${config.JOB_SERVER_PATH}/api/user/addNew`;
  return Request.post(url, data, {
    headers: {
      'x-access-token': genHash(),
    },
  })
  .then(resp => {
    console.info('KYC info added to Job Server', resp.data);
    return resp.data;
  })
  .catch(error => {
    console.info('adding KYC info failed to Job Server', _.get(error, 'response.data', error));
    return {success: false, error};
  });
};
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const users = await queryInterface.sequelize.query(
      `SELECT "Users"."userId", "Users"."email", "Documents"."addressProof", "Documents"."idProof", "Documents"."bankDetails" 
       from "Users"
       join "Documents"
      on "Users"."userId" = "Documents"."userId"
    `, {type: Sequelize.QueryTypes.SELECT});
    console.log('All users with KYC docs: ', users.length);
    for (let user of users) {
      console.log('New User: ', user.email);
      const bankDetails = user.bankDetails[0];
      const jobServerUser = {
        serverUserId: user.userId,
        name: `${user.idProof.firstName} ${_.get(user, 'idProof.middleName', '')} ${user.idProof.lastName}`,
        account_ifsc: bankDetails.ifscCode,
        account_number: bankDetails.bankAccountNumber,
        account_beneficiary_name: bankDetails.bankAccountHolderName,
        account_type: bankDetails.accountType,
        bank_name: bankDetails.bankName,
        bank_branch: bankDetails.bankBranch,
        email: user.email,
        phone: user.addressProof.phone
      };
      const response = await jobApi(jobServerUser);
      if (response._id) {
        const jobObj = _.pick(response, ['id', 'virtual_account_number', 'virtual_account_ifsc']);
        let t = await queryInterface.sequelize.query(`
          UPDATE "Users"
          SET "jobServer" = '${JSON.stringify(jobObj)}'
          WHERE "Users"."userId" = '${user.userId}'
        `);
        console.log('Success for user', user.email);
      } else {
        console.log('Failed to get user object', response, user.email);
      }
    }
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
  },

  down: (queryInterface, Sequelize) => {
    console.log('Something went wrong now cry!!');
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
  }
};

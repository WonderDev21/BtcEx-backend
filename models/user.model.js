'use strict';
const Sequelize = require('sequelize');
const bcrypt = require('bcryptjs');
const Promise = require('bluebird');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const randomNatural = require('random-natural');
const logger = require('winston');
const emailService = require('../services/email.service');
const AppConfig = require('../config/appConfig.js');
const {verificationStatus} = require('../constants/userConstants');
const {verificationEmailOptions} = require('../constants/serverConstants');
const TFAUtils = require('../utils/2FAUtils');
const cryptoUtils = require('../utils/cryptoUtils');
const {baseURL, APP_URL, APP_NAME, SUPPORT_EMAIL,} = require('../config');

const userSchemaObject = {
  fullName: Sequelize.STRING,
  profileImage: Sequelize.STRING,
  userId: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  jobServer: Sequelize.JSON, // {id: '', virtual_account_number: '', virtual_account_ifsc: ''}
  customerId: {
    type: Sequelize.STRING,
    unique: true,
  },
  refId: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    unique: true,
    /* ALTER SEQUENCE Users_refId_seq RESTART WITH 1200 to start counter from 1200  */
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: {args: true, msg: 'This Email address is already in use!'},
    validate: {
    isEmail: true,
    set: function(val) {
      this.setDataValue('email', val.toLowerCase());
    }
  }},
  isVerified: {type: Sequelize.BOOLEAN, defaultValue: false},
  kycVerified: {
    type: Sequelize.ENUM,
    values: Object.keys(verificationStatus),
    defaultValue: verificationStatus.UNVERIFIED
  },
  password: {type: Sequelize.TEXT, allowNull: false},
  TFAKey: {type: Sequelize.JSON, defaultValue: {isEnabled: false}}, // {isEnabled: '', secret: ''}
  phone: {
    type: Sequelize.STRING,
    // defaultValue: Sequelize.UUIDV4, // phone no. in not required for bxc
    // unique: {args: true, msg: 'This Phone no. is already in use!'},
    // allowNull: false,
  },
  isBlocked: {type: Sequelize.BOOLEAN, defaultValue: false},
  joined: Sequelize.DATE, // this is not same as createdAt, instead when user is verified on platform
  lastLogin: Sequelize.DATE, // this will update after every login
  isAdmin: Sequelize.BOOLEAN,
  dailyPriceNotification: {type: Sequelize.BOOLEAN, defaultValue: true},
  referredby: Sequelize.STRING,
  kycReason: Sequelize.STRING,
  sumSubKycVerified: {
    type: Sequelize.ENUM,
    values: Object.keys(verificationStatus),
    defaultValue: verificationStatus.UNVERIFIED
  },
  country: Sequelize.STRING,
};
const validationObject = {
  hooks: {
    beforeCreate: function(user, options, callback) {
      try {
        const hashedPassword = user.generateHashPassword(user.password);
        user.set('password', hashedPassword);
        user.set('phone', '91' + user.phone);
        return callback(null, options);
      } catch(err) {
        return callback(err, options);
      }
    },
    afterCreate: function(user, options, callback) {
      try {
        let customerId = '';
        if (user.refId <= 999) { // BX001100 - BX00999999
          customerId = `BX00${user.refId}${randomNatural({min: 100, max: 999})}`;
        } else if(user.refId <= 9999) { // BX0100010 - BX0999999
          customerId = `BX0${user.refId}${randomNatural({min: 10, max: 99})}`;
        } else if(user.refId <= 99999) { // BX100001 - BX999999
          customerId = `BX${user.refId}${randomNatural({min: 1, max: 9})}`;
        } else { // BX10000010 - BX-x-x-x-99
          customerId = `BX${user.refId}${randomNatural({min: 10, max: 99})}`;
        }
        user.updateAttributes({customerId: customerId})
        .then((updatedUser) => {
          logger.info(`New user registered with customerId ${updatedUser.customerId}`);
          callback(null, options);
        });
      } catch(err) {
        logger.info(`PRIORITY 0: New user registration Failed with userId ${user.userId}`);
        callback(err, options);
      }
    }
  },

  instanceMethods: {
    compareTFA: function(code) {
      const secret = cryptoUtils.decrypt(this.TFAKey.secret);
      console.log('compareTFA', secret);
      const status = TFAUtils.verify2FA(code, secret);
      console.log('compareTFA', status);
      return status;
    },
    generateHashPassword: function(passwordText) {
      try {
        const salt = bcrypt.genSaltSync(10);
        const derivedKey = bcrypt.hashSync(passwordText, salt);
        return derivedKey;
      } catch(err) {
        return err;
      }
     }, // method1
     comparePassword: function(user, userPwd) {
       try {
        const result = bcrypt.compareSync(userPwd, user.toJSON().password);
        return result;
       } catch(err) {
         return err;
       }
     },
    sendMailOnRegister: async function (token) {
      try {
        const emailTemplate = fs.readFileSync(path.join(process.cwd(), 'mailer/output/verificationMail.html'));
        const compiled = _.template(emailTemplate);
        const output = compiled({
          APP_URL,
          APP_NAME,
          SUPPORT_EMAIL,
          userEmail: this.email,
          fullName: this.fullName,
          VERIFICATION_URL: `${baseURL}/user/verify?token=${token}`,
        });
        const mailOption = {
          from: verificationEmailOptions.senderEmail,
          to: this.email,
          subject: verificationEmailOptions.subject,
          html: output,
        };
        const resp = await emailService.sendEmail(mailOption);
        return resp;
      } catch(error) {
        console.log('Error while sending email', error);
        return {message: 'Some error in sending mail', error: error};
      }
          /*
          const transporter = nodemailer.createTransport(smtpTransport({
            host: verificationEmailOptions.host,
            port: verificationEmailOptions.port,
            auth: verificationEmailOptions.auth,
          }));
          transporter.sendMail(mailOption, function(err, info) {
            if (err) {
              reject(err);
            }
            console.log('Message % sent: %s', info.messageId, info.response);
            resolve(info.response);
          });
          */
    }
  }  // instance method
};
module.exports = (sequelize) => {
  const User = sequelize.define('User', userSchemaObject, _.assign({},
    validationObject,
    {
      classMethods: {
        associate: function(models) {
          User.hasMany( models.Account, {as: 'accounts', foreignKey: 'userId'});
        }
      }
    })
  );
  return User;
};

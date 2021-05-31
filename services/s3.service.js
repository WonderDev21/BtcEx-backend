const Promise = require('bluebird');
const AWS = require('aws-sdk');
const fs = require('fs');
const _ = require('lodash');
const AppConfig = require('../config/appConfig.js');

AWS.config.update({
  accessKeyId: AppConfig.S3_ACCESS_KEY,
  secretAccessKey: AppConfig.S3_SECRET_KEY,
  region: AppConfig.S3_REGION,
  signatureVersion: AppConfig.S3_SIGNATURE_VERSION
});

function getRegion(bucket) {
  return new Promise((resolve, reject) => {
    const s3 = new AWS.S3();
    const params = {Bucket: bucket};
    s3.getBucketLocation(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

exports.uploadFile = (bucket, key, path) => {
  return new Promise((resolve, reject) => {
    const s3 = new AWS.S3();
    const readFile = Promise.promisify(fs.readFile);
    readFile(path)
      .then((content) => {
        const params = {Bucket: bucket, Key: key, Body: content};
        s3.upload(params, (err, response) => {
          if (err) {
            reject(err);
          } else {
            getRegion(bucket)
              .then((region) => {
                const url = `https://s3-${region.LocationConstraint}.amazonaws.com/${bucket}/${key}`;
                const newResponse = _.assign({}, response, {location: url});
                resolve(newResponse);
              }).catch(reject);
            }
        });
      });
  });
};
exports.deleteFile = (bucket, key) => {
  return new Promise((resolve, reject) => {
    const s3 = new AWS.S3();
    const params = {Bucket: bucket, Key: key};
    s3.deleteObjects(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};
exports.getFileUrl = (bucket, key, opts = {}) => {
  return new Promise((resolve, reject) => {
    const s3 = new AWS.S3();
    const params = {
      Bucket: bucket,
      Key: key,
      Expires: _.get(opts, 'expires', 3600) // 3600 secs = 1hr
    };
    if (opts.contentType) {
      params.ContentType = opts.contentType;
    }
    if (opts.ACL) {
      params.ACL = opts.ACL;
    }
    s3.getSignedUrl('getObject', params, (error, url) => {
      if (error) {
        reject(error);
      } else {
        resolve(url);
      }
    });
  });
};

exports.downloadFile = (bucket, key, path) => {
  return new Promise((resolve, reject) => {
    const s3 = new AWS.S3();
    const params = {Bucket: bucket, Key: key};
    const writeStream = fs.createWriteStream(path);
    s3.getObject(params).createReadStream().pipe(writeStream);
    writeStream.on('finish', function () {
      resolve(path);
    })
    .on('error', function (err) {
      reject('Write stream to ' + path + ' did not finish successfully: ' + err);
    });
  });
};

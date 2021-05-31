const path = require('path');
const fs = require('fs');
const format = require('util').format;
const storage = require('@google-cloud/storage')({
  projectId: 'chiprally-175605',
  keyFilename: path.join(__dirname, '../config/gcs-key.json')
});


exports.uploadFile = (bucketName, fileName, filePath) => {
  const bucket = storage.bucket(bucketName || 'chiprally-test');
  return new Promise((resolve, reject) => {
    try {
      const localReadStream = fs.createReadStream(filePath);
      const remoteWriteStream = bucket.file(fileName).createWriteStream();
      localReadStream.pipe(remoteWriteStream);
      const privateUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      resolve(privateUrl);
    } catch(err) {
      reject(err);
    }
  });
};
exports.deleteFile = () => {
  
};

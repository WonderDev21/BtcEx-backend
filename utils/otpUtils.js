const crypto = require('crypto');
const OTP_LENGTH = 6;
exports.generateRandomOTP = () => {
  const buf = crypto.randomBytes(OTP_LENGTH);
  let otpString = '';
  for(let i=0; i<OTP_LENGTH; i++) {
    otpString += Math.floor(buf[i]/256 * 10);
  }
  return otpString.substr(0, 6); // in case of failure
};

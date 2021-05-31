exports.getMaskedEmail = (email = '') => {
  const [username, domain] = email.split('@');
  let masked = '';
  masked += username.slice(0, 2);
  masked += new Array(username.length - 2 > 0 ? username.length - 2 : 1).fill('x').join('');
  masked += ('@' + domain);
  return masked;
};
exports.getMaskedPhone = (phone = '') => {
  let masked = '';
  masked += phone.slice(2, 4);
  masked += new Array(phone.length - 7 > 0 ? phone.length - 7 : 1).fill('x').join('');
  masked += phone.slice(-3);
  return masked;
};
exports.encodeString = (str = '', t = 3) => {
  let encoded = '';
  try {
    let tmp = str;
    for (let i=0; i<t; i++) {
      tmp = new Buffer(tmp).toString('base64');
    }
    encoded = tmp;
  } catch(err) {
    encoded = '';
  }
  return encoded;
};

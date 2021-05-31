var keythereum = require("keythereum");

var { web3 } = require('../setup/web3');
var Tx = require('ethereumjs-tx');

exports.createEtherClassicWallet = async (userId) => {
  var params = { keyBytes: 32, ivBytes: 16 };
  let dk = keythereum.create(params);
    
  var password = userId;
  var options = {
    kdf: "pbkdf2",
    cipher: "aes-128-ctr",
    kdfparams: {
      c: 262144,
      dklen: 32,
      prf: "hmac-sha256"
    }
  };

  return keythereum.dump(password, dk.privateKey, dk.salt, dk.iv, options, function (keyObject) {
    console.log('Private Key: ', (dk.privateKey).toString('hex'));
    console.log('Key Object: ', keyObject);
    const address = web3.personal.importRawKey((dk.privateKey).toString('hex'),`${userId}`);
    console.log('Address: ', address);
    return {keyObject,address};
  });
}

exports.getPrivateKey = async (password, keyObject) => {
  return keythereum.recover(password, keyObject, (privateKey) => { console.log('Private Key: ', privateKey); return privateKey });
}

exports.transferEtherClassic = async (sender, reciver, userPrivateKey, value) => {
  try {
    const transaction = web3.personal.sendTransaction({
      'from': sender,
      'to': reciver,
      'value':value,
      'gasPrice': 100
    }, userPrivateKey); 
    return transaction;
  } catch(error){
    return(error);
  }
}
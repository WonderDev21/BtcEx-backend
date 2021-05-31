const logger = require('winston');
const emailVerify = (req, res, next) => {
  const user = req.user;
  if (user) {
    if (user.isVerified) {
      next();
    } else {
      res.status(403).send({message: "User's Email Not Verified"});
    }
  } else {
    logger.info('USER NOT FOUND IN EMAIL MIDDLEWARE');
    res.status(401).send({message: "USER DOESN'T EXIST"});
  }
};
module.exports = emailVerify;

// const IeoProject = require('../models').models.IeoProject;
const IEOService = require('../services/ieo.service');

// exports.getAllAccounts = async () => arrayToJSON(await Account.findAll());
exports.getAllIEOProjects = async (req, res) => {
  try {
    const ieos = await IEOService.getAllIEOProjects();
    res.status(200).send(ieos);
  } catch(err) {
    res.status(400).send({message: 'ERROR getting IEOS', err});
  }
};
exports.getIEOProject = async(req, res) => {
  try {
    const slug = req.params.slug;
    const ieoProject = await IEOService.getIEOProject(slug);
    res.status(200).send(ieoProject);
  } catch(err) {
    res.status(400).send({message: 'ERROR getting IEO', err});
  }
};
exports.getAllIEOPurchases = async(req, res) => {
  try {
    const userId = req.user.userId;
    const userAccounts = await IEOService.getAllIEOPurchases(userId);
    res.status(200).send(userAccounts);
  } catch(err) {
    res.status(400).send({message: 'ERROR getting Account Details', err});
  }
};
exports.addIEOProject = async(req, res) => {
  try {
    const ieoProject = await IEOService.addIEOProject(req.body);
    res.status(200).send(ieoProject);
  } catch(err) {
    res.status(400).send({message: 'ERROR adding IEO Project', err});
  }
};
exports.updateIEOProject = async(req, res) => {
  try {
    const slug = req.params.slug;
    const updated = await IEOService.updateIEOProject(slug, req.body);
    res.status(200).send(updated);
  } catch(err) {
    res.status(400).send({message: 'ERROR updating IEO Project', err});
  }
};
exports.createNewSale = async(req, res) => {
  try {
    const slug = req.params.slug;
    const newSale = await IEOService.addNewIEOSale(req.user, slug, req.body);
    if(newSale.success) {
      res.status(200).send(newSale);
    } else {
      res.status(400).send(newSale);
    }
  } catch(err) {
    res.status(400).send({message: 'ERROR placing IEO Order', err});
  }
};

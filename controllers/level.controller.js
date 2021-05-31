const levelService = require('../services/level.service');

exports.addLevel = async(req, res) => {
  try{
    const level = await levelService.addLevel(req.body);
    res.status(200).send(level);
  } catch(error){
    res.status(400).send(error);
  }
};

exports.getLevelByPriceAndSide = async(req, res) =>  {
  try{
    const level = await levelService.getLevelByPriceAndSide(req.body);
    res.status(200).send(level);
  } catch(error){
    res.status(400).send(error);
  }
};

exports.getLevelById  = async (req, res) => {
  try{
    const level = await levelService.getLevelById(req.params.levelId);
    res.status(200).send(level);
  } catch(error){
    res.status(400).send(error);
  }
};

exports.findAndUpdatebyLevelId = async (req, res) => {
  try{
    const updatedlevel = await levelService.findAndUpdatebyLevelId(req.params.levelId, req.body);
    res.status(200).send(updatedlevel);
  } catch(error){
    res.status(400).send(error);
  }
};

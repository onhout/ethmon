import express from "express";

let router = express.Router();


// GET miner data
router.get('/', function (req, res) {
    res.render('market_sim', {});
});

export default router;

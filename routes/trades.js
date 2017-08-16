import express from "express";

let router = express.Router();


// GET miner data
router.get('/', function (req, res) {
    res.render('trades', {});
});

export default router;

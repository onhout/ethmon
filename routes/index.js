import express from "express";
let router = express.Router();

// GET home page
router.get('/', function (req, res, next) {
    res.render('index', {
        title: req.json.title,
        header: req.json.header,
        hashrates: req.json.hashrates
    });
});

export default router;

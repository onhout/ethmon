#!/usr/bin/env node
import express from "express";
import path from "path";
import favicon from "serve-favicon";
import express_logger from "morgan";
import Server from "./server";
import routes from "./routes/index";
import miners from "./routes/miners";
import marketSim from "./routes/market_sim";
import moment from "moment";

const config = require('./config.json');

/**
 * Module dependencies.
 */
const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');


// Uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express_logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/js', express.static(__dirname + '/node_modules/popper.js/dist/umd')); // redirect JS jQuery
app.use('/js', express.static(__dirname + '/node_modules/tooltip.js/dist/umd')); // redirect JS jQuery
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap


// Make miner data accessible to the router
app.use(function(req, res, next) {
    req.json = {
        "title"       : config.title,
        "animation"   : config.animation,
        "header"      : config.header ? config.header : config.title,
        "miners"      : miners.json,
        "refresh"     : config.web_refresh,
        "tolerance"   : config.tolerance,
        "temperature" : config.temperature,
        "hashrates"   : config.hashrates,
        "updated"     : moment().format("YYYY-MM-DD HH:mm:ss")
    };
    next();
});

app.use('/', routes);
app.use('/miners', miners);
app.use('/market-simulator', marketSim);

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});


// Development error handler will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// Production error handler, no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;


const running_server = new Server(app);
export default running_server;
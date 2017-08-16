/**
 * Created by pl on 8/4/17.
 */
import socket from "socket.io";
import Market from "./market_trade";

const net = require('net');
const moment = require('moment');
const config = require('./config.json');
require("moment-duration-format");
// const gpio = require('rpi-gpio');
const delay = 2000;
const bittrex = require('node.bittrex.api');


class Socket {
    constructor(server) {
        this.server = socket(server);
        let socketserver = this.server;

        let miners = {};
        miners.json = [];

        bittrex.options({
            'apikey': config.bittrex_key,
            'apisecret': config.bittrex_secret
        });

        let intervals = {};

        let bittrex_market = new Market();

        socketserver.on('connection', function (socket) {
            // socket.on('restartBtn', function (pin) {
            //     gpio.setup(pin, gpio.DIR_OUT, on);
            //
            //     function on() {
            //         setTimeout(function () {
            //             gpio.write(pin, 1, destroy);
            //         }, delay);
            //     }
            //
            //     function destroy() {
            //         gpio.destroy(function () {
            //             console.log('Closed pins, now exit');
            //         });
            //     }
            // });

            socket.on('market summary', function () {
                getMarket();
                clearInterval(intervals.monitor);
                intervals.summary = setInterval(() => {
                    getMarket()
                }, 60000);
            });

            socket.on('bittrex balance', function () {
                getMarket();
                clearInterval(intervals.summary);
                intervals.monitor = setInterval(() => {
                    getMarket();
                }, 60000);
            });

            socket.on('disconnect', function () {
                clearInterval(intervals.summary);
                clearInterval(intervals.monitor);
            });

            socket.on('start trade', () => {
                bittrex_market.startTrade(socket);
                socket.emit('btnState', {start: true, stop: false});
                intervals.trade = setInterval(() => {
                    bittrex_market.startTrade()
                }, 60000)
            });

            socket.on('stop trade', () => {
                socket.emit('btnState', {start: false, stop: true});
                clearInterval(intervals.trade);
            });

            socket.on('altcoin sell', () => {
                bittrex_market.altCoinSellOff();
            })

        });

        function getMarket() {
            bittrex_market.getETHBTCMarkets(function (data) {
                socketserver.emit('market data', data);
            });
        }

        config.miners.forEach(function (item, i, arr) {

            // settings
            var m = miners[i] = {};
            var c = config.miners[i];
            var j = miners.json[i];

            m.name = c.name;
            m.host = c.host;
            m.port = c.port;
            m.poll = (typeof c.poll !== 'undefined') ? c.poll : config.miner_poll;
            m.timeout = (typeof c.timeout !== 'undefined') ? c.timeout : config.miner_timeout;

            function hostname() {
                return c.hostname ? c.hostname : (m.host + ':' + m.port);
            }

            // stats
            m.reqCnt = 0;
            m.rspCnt = 0;

            // it was never seen and never found good yet
            c.last_seen = null;
            c.last_good = null;

            // socket
            m.socket = new net.Socket()

                .on('connect', function () {
                    var req = '{"id":0,"jsonrpc":"2.0","method":"miner_getstat1"}';
                    ++m.reqCnt;
                    m.socket.write(req + '\n');
                    m.socket.setTimeout(m.timeout);
                })

                .on('timeout', function () {
                    m.socket.destroy();
                    miners.json[i] = {
                        "name": m.name,
                        "host": hostname(),
                        "uptime": "",
                        "eth": "",
                        "sec": "",
                        "eth_hr": "",
                        "sec_hr": "",
                        "temps": "",
                        "pools": "",
                        "ver": "",
                        "target_eth": "",
                        "target_sec": "",
                        "comments": c.comments,
                        "offline": c.offline,
                        "warning": null,
                        "error": 'Error: no response',
                        "last_seen": c.last_seen ? c.last_seen : 'never'
                    };
                    socketserver.emit('incoming', miners.json);
                })

                .on('data', function (data) {
                    ++m.rspCnt;
                    c.last_seen = moment().format("YYYY-MM-DD HH:mm:ss");
                    m.socket.setTimeout(0);
                    var d = JSON.parse(data);
                    miners.json[i] = {
                        "name": m.name,
                        "host": hostname(),
                        "uptime": moment.duration(parseInt(d.result[1]), 'minutes').format('d [days,] hh:mm'),
                        "eth": d.result[2],
                        "sec": d.result[4],
                        "eth_hr": d.result[3],
                        "sec_hr": d.result[5],
                        "temps": d.result[6],
                        "pools": d.result[7],
                        "ver": d.result[0],
                        "pinnumber": c.pinnumber,
                        "target_eth": c.target_eth,
                        "target_sec": c.target_sec,
                        "comments": c.comments,
                        "offline": c.offline,
                        "ti": c.ti ? c.ti : null,
                        "error": null,
                        "title": config.title,
                        "animation": config.animation,
                        "header": config.header ? config.header : config.title,
                        // "miners"      : miners.json,
                        "refresh": config.web_refresh,
                        "tolerance": config.tolerance,
                        "temperature": config.temperature,
                        "hashrates": config.hashrates,
                        "updated": moment().format("YYYY-MM-DD HH:mm:ss")
                    };
                    socketserver.emit('incoming', miners.json);
                    if (c.target_eth && config.tolerance) {
                        if (miners.json[i].eth.split(';')[0] / 1000 < c.target_eth * (1 - config.tolerance / 100)) {
                            miners.json[i].warning = 'Low hashrate';
                            miners.json[i].last_good = c.last_good ? c.last_good : 'never';
                        } else {
                            miners.json[i].warning = null;
                            c.last_good = moment().format("YYYY-MM-DD HH:mm:ss");
                        }
                    }
                })

                .on('close', function () {
                    setTimeout(poll, m.poll);
                })

                .on('error', function (e) {
                    miners.json[i] = {
                        "name": m.name,
                        "host": hostname(),
                        "uptime": "",
                        "eth": "",
                        "sec": "",
                        "eth_hr": "",
                        "sec_hr": "",
                        "temps": "",
                        "pools": "",
                        "ver": "",
                        "target_eth": "",
                        "target_sec": "",
                        "comments": c.comments,
                        "offline": c.offline,
                        "warning": null,
                        "error": e.name + ': ' + e.message,
                        "last_seen": c.last_seen ? c.last_seen : 'never'
                    };
                    socketserver.emit('incoming', miners.json);
                });

            function poll() {
                m.socket.connect(m.port, m.host);
            };

            if ((typeof c.offline === 'undefined') || !c.offline) {
                poll();
            } else {
                miners.json[i] = {
                    "name": m.name,
                    "host": hostname(),
                    "uptime": "",
                    "eth": "",
                    "sec": "",
                    "eth_hr": "",
                    "sec_hr": "",
                    "temps": "",
                    "pools": "",
                    "ver": "",
                    "target_eth": "",
                    "target_sec": "",
                    "comments": c.comments,
                    "offline": c.offline,
                    "error": null
                };
            }
        });

        let SIMULATEDBALANCE = {
            Starting_Bal: 0,
            BTC: 0,
            ETH: 0,
            SECONDARY: 0
        };
        let Trades = 0;

        function startSimulation(Market, currency, balance) {
            if (!SIMULATEDBALANCE.BTC && !Trades && !SIMULATEDBALANCE.ETH) {
                SIMULATEDBALANCE.BTC = balance.find(n => n.Currency === 'BTC').Available * currency.BTC;
                SIMULATEDBALANCE.Starting_Bal = SIMULATEDBALANCE.BTC;
            } else if (!SIMULATEDBALANCE.ETH && !Trades && !SIMULATEDBALANCE.BTC) {
                SIMULATEDBALANCE.ETH = balance.find(n => n.Currency === 'ETH').Available * currency.ETH;
                SIMULATEDBALANCE.Starting_Bal = SIMULATEDBALANCE.ETH;
            }

            let mostProfitableBTC = BTCETHDiff(Market, currency)[0];
            let mostProfitableETH = ETHBTCDiff(Market, currency)[0];

            if (mostProfitableBTC.percent > 0.5 && SIMULATEDBALANCE.BTC !== 0) {
                SIMULATEDBALANCE.SECONDARY = (SIMULATEDBALANCE.BTC / (mostProfitableBTC.BUY * currency.BTC)) * FeesForBittrex;
                SIMULATEDBALANCE.ETH = SIMULATEDBALANCE.SECONDARY * (mostProfitableBTC.SELL * currency.ETH) * FeesForBittrex;
                SIMULATEDBALANCE.BTC = 0;
                Trades++;
                return;
            }
            if (mostProfitableETH.percent > 0.5 && SIMULATEDBALANCE.ETH !== 0) {
                SIMULATEDBALANCE.SECONDARY = (SIMULATEDBALANCE.ETH / (mostProfitableETH.BUY * currency.ETH)) * FeesForBittrex;
                SIMULATEDBALANCE.BTC = SIMULATEDBALANCE.SECONDARY * (mostProfitableETH.SELL * currency.BTC) * FeesForBittrex;
                SIMULATEDBALANCE.ETH = 0;
                Trades++;
                return;
            }
        }
    }
}

export default Socket
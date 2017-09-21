/**
 * Created by pl on 8/4/17.
 */
import socket from "socket.io";
import Poloniex from "./poloniex";
import Bittrex from "./bittrex";

const net = require('net');
const moment = require('moment');
const config = require('./config.json');
require("moment-duration-format");
// const gpio = require('rpi-gpio');
const delay = 2000;


class Socket {
    constructor(server) {
        this.server = socket(server);
        let socketserver = this.server;

        let miners = {};
        miners.json = [];

        let intervals = {};
        let poloniex = new Poloniex(socketserver);
        let bittrex = new Bittrex(socketserver);
        poloniex.returnMarket();

        setInterval(() => {
            poloniex.returnOrders();
        }, 9000);

        setTimeout(() => {
            poloniex.collect_chartData();
        }, 6666);

        socketserver.on('connection', socket => {
            // socket.on('restartBtn', function (pin) {
            //     gpio.setup(pin, gpio.DIR_OUT, on);
            //
            //     function on() {
            //         setTimeout(() => {
            //             gpio.write(pin, 1, destroy);
            //         }, delay);
            //     }
            //
            //     function destroy() {
            //         gpio.destroy(() => {
            //             console.log('Closed pins, now exit');
            //         });
            //     }
            // });

            socket.on('buy and sell now', data => {
                poloniex.buySell(data);
            });

            socket.on('cancel order', data => {
                poloniex.cancelOrder(data);
            });

            socket.on('get poloniex market', () => {
                poloniex.returnMarket();
                intervals.market = setInterval(() => {
                    poloniex.returnMarket();
                }, 5000);
            });

            socket.on('get poloniex orders', () => {
                poloniex.returnBalances();
                intervals.orders = setInterval(() => {
                    poloniex.returnBalances();
                }, 13000);
            });

            socket.on('get chart data', () => {

            });

            socket.on('disconnect', () => {
                clearInterval(intervals.market);
                clearInterval(intervals.orders);
                clearInterval(intervals.chartdata);
                clearInterval(intervals.balance);
            });

            socket.on('get bittrex balance', () => {
                bittrex.getBittrexBalances();
                intervals.balance = setInterval(() => {
                    bittrex.getBittrexBalances()
                }, 10000)
            })
        });

        Socket.runMonitor(miners, socketserver);
    }

    static runMonitor(miners, socketserver) {
        config.miners.forEach((item, i, arr) => {
            // settings
            let m = miners[i] = {};
            let c = config.miners[i];
            let j = miners.json[i];

            m.name = c.name;
            m.host = c.host;
            m.port = c.port;
            m.poll = (typeof c.poll !== 'undefined') ? c.poll : config.miner_poll;
            m.timeout = (typeof c.timeout !== 'undefined') ? c.timeout : config.miner_timeout;


            let hostname = () => {
                return c.hostname ? c.hostname : (m.host + ':' + m.port);
            };

            // stats
            m.reqCnt = 0;
            m.rspCnt = 0;

            // it was never seen and never found good yet
            c.last_seen = null;
            c.last_good = null;

            // socket
            m.socket = new net.Socket()

                .on('connect', () => {
                    let req = '{"id":0,"jsonrpc":"2.0","method":"miner_getstat1"}';
                    ++m.reqCnt;
                    m.socket.write(req + '\n');
                    m.socket.setTimeout(m.timeout);
                })

                .on('timeout', () => {
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

                .on('data', data => {
                    ++m.rspCnt;
                    c.last_seen = moment().format("YYYY-MM-DD HH:mm:ss");
                    m.socket.setTimeout(0);
                    let d = JSON.parse(data);
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

                .on('close', () => {
                    setTimeout(poll, m.poll);
                })

                .on('error', e => {
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

            let poll = () => {
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
    }
}

export default Socket
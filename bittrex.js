import bittrex from "node.bittrex.api";
import request from "request";
const config = require('./config.json');

class BITTREX {
    constructor(socket) {
        this.ethPrice = 0;
        this.socket = socket;
        this.estimator = [];
        bittrex.options({
            'apikey': config.bittrex_key,
            'apisecret': config.bittrex_secret
        });
    }

    static parseCurrency(data, callback) {
        let currencyMatch = [
            'USDT-NEO',
            'USDT-BCC',
            'USDT-BTC',
            'USDT-DASH',
            'USDT-ETC',
            'USDT-ETH',
            'USDT-LTC',
            'USDT-XMR',
            'USDT-XRP',
            'USDT-ZEC'];
        let currencies = {};
        data.forEach((ele) => {
            currencyMatch.forEach((match) => {
                if (ele.MarketName === match) {
                    currencies[match.replace('USDT-', '')] = ele.Last;
                }
            })
        });
        callback(currencies);
    }

    static estimatingFigure() {
        let obj = this;
        request.get('https://etherchain.org/api/miningEstimator', (err, res, body) => {
            if (!err) {
                let bb = JSON.parse(body);
                obj.estimator = bb.data[0];
            }
        });
        if (obj.estimator !== undefined) {
            return obj.estimator
        } else {
            return null;
        }
    }

    getBittrexBalances() {
        let obj = this;
        bittrex.getmarketsummaries((data, err) => {
            // let ETHMarket = data.result.filter(ele => (ele.MarketName.indexOf('ETH-') === 0));

            if (err) {
                return console.error(err);
            }
            BITTREX.parseCurrency(data.result, (currency) => {
                obj.ethPrice = currency.ETH;
                bittrex.getbalances((balances, err) => {

                    let BTCMarket = data.result.filter(ele => ele.MarketName.indexOf('BTC-') === 0);
                    // let market = {eth: ETHMarket, btc: BTCMarket};
                    let balance = balances.result.filter(bal => bal.Balance > 0);

                    let correctedBalance = balance.map((item) => {
                        let thisitem = BTCMarket.find(name => name.MarketName.slice(4, name.MarketName.length) === item.Currency);
                        if (thisitem) {
                            item.LastRate = thisitem.Last;
                            item.TotalBTCValue = (thisitem.Last * item.Balance);
                            item.USDValue = item.TotalBTCValue * currency.BTC;
                        } else {
                            item.LastRate = 1;
                            item.TotalBTCValue = item.Balance;
                            item.USDValue = item.TotalBTCValue * currency.BTC;
                        }
                        return item
                    });
                    if (err) {
                        console.log("ERROR")
                    } else {
                        obj.socket.emit('bittrex balance', {
                            balances: correctedBalance,
                            currency: currency,
                            estimateFigure: BITTREX.estimatingFigure()
                        })
                    }
                })
            })
        });
    }
}


export default BITTREX;
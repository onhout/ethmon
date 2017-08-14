// Default web refresh interval (may be changed with web_refresh config option)
let refresh = 5000;

// Default hashrate tolerance (+/- to target hashrate)
let tolerance = 0.05;

// GPU temperature monitoring threshold (zero disables monitoring)
let temperature = 0;

// Title animation index
let animation_index = 0;


// DOM Ready =============================================================

$(document).ready(() => {
    const socket = io();

    socket.emit('market summary')

    socket.on('market data', (data) => {
        console.log(data);
        const BTCmarketTable = $('#BTCmarketTable tbody');
        const ETHmarketTable = $('#ETHmarketTable tbody');
        const BTCETHProfit = $('#BTCETHProfit tbody');
        const ETHBTCProfit = $('#ETHBTCProfit tbody');
        const BittrexFee = 1.0025;
        BTCmarketTable.html('');
        ETHmarketTable.html('');
        BTCETHProfit.html('');
        ETHBTCProfit.html('');
        let tdBid = '';
        let tdAsk = '';
        let tdVolume = '';
        let tdName = '';
        data.market_data.btc.forEach((ele) => {
            let BtcBuyPrice = (parseFloat(ele.Ask) * data.currency.BTC);
            let str = ele.MarketName.slice(4, ele.MarketName.length);
            let EthSellPrice = (data.market_data.eth.find(name => name.MarketName.slice(4, name.MarketName.length) === str).Bid) * data.currency.ETH;
            let Percentage = (100 - ((BtcBuyPrice * BittrexFee) / (EthSellPrice * BittrexFee)) * 100).toFixed(4);
            let TDBTCETH = '';

            //^^^^ MARKET XCHANGE ^^^^//
            tdName = '<td>' + ele.MarketName + '</td>';
            let MARKED = Percentage > 0.5 ? 'bg-success' : '';

            if (Percentage > 0.5 && Percentage < 1) {
                TDBTCETH = '<td class="text-warning">' + Percentage + '%</td>';
                BTCETHProfit.append('<tr>' + tdName + TDBTCETH + '</tr>');
            } else if (Percentage > 1.0) {
                TDBTCETH = '<td class="text-success">' + Percentage + '%</td>';
                BTCETHProfit.append('<tr>' + tdName + TDBTCETH + '</tr>');
            }
            tdBid = '<td>$' + (parseFloat(ele.Bid) * data.currency.BTC).toFixed(6) + '</td>';
            tdAsk = '<td>$' + (parseFloat(ele.Ask) * data.currency.BTC).toFixed(6) + '</td>';
            tdVolume = '<td>$' + (parseFloat(ele.Volume) * data.currency.BTC).toFixed(2) + '</td>';
            BTCmarketTable.append('<tr class="' + MARKED + '">' + tdName + tdBid + tdAsk + tdVolume + '</tr>');
        });
        data.market_data.eth.forEach((ele) => {
            let EthBuyPrice = (parseFloat(ele.Ask) * data.currency.ETH);
            let str = ele.MarketName.slice(4, ele.MarketName.length);
            let BtcSellPrice = (data.market_data.btc.find(name => name.MarketName.slice(4, name.MarketName.length) === str).Bid) * data.currency.BTC;
            let Percentage = (100 - ((EthBuyPrice * BittrexFee) / (BtcSellPrice * BittrexFee)) * 100).toFixed(4);
            let TDETHBTC = '';

            tdName = '<td>' + ele.MarketName + '</td>';
            let MARKED = Percentage > 0.5 ? 'bg-success' : '';

            if (Percentage > 0.5 && Percentage < 1) {
                TDETHBTC = '<td class="text-warning">' + Percentage + '%</td>';
                ETHBTCProfit.append('<tr>' + tdName + TDETHBTC + '</tr>');
            } else if (Percentage > 1.0) {
                TDETHBTC = '<td class="text-success">' + Percentage + '%</td>';
                ETHBTCProfit.append('<tr>' + tdName + TDETHBTC + '</tr>');
            }
            tdBid = '<td>$' + (parseFloat(ele.Bid) * data.currency.ETH).toFixed(6) + '</td>';
            tdAsk = '<td>$' + (parseFloat(ele.Ask) * data.currency.ETH ).toFixed(6) + '</td>';
            tdVolume = '<td>$' + (parseFloat(ele.Volume) * data.currency.ETH).toFixed(2) + '</td>';
            ETHmarketTable.append('<tr class="' + MARKED + '">' + tdName + tdBid + tdAsk + tdVolume + '</tr>');
        });
    });
})
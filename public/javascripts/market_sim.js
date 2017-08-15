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
        BTCmarketTable.html('');
        ETHmarketTable.html('');
        BTCETHProfit.html('');
        ETHBTCProfit.html('');
        let tdBid = '';
        let tdAsk = '';
        let tdVolume = '';
        let tdName = '';
        data.market_data.btc.forEach((ele) => {
            tdName = '<td>' + ele.MarketName + '</td>';
            tdBid = '<td>$' + (parseFloat(ele.Bid) * data.currency.BTC).toFixed(6) + '</td>';
            tdAsk = '<td>$' + (parseFloat(ele.Ask) * data.currency.BTC).toFixed(6) + '</td>';
            tdVolume = '<td>$' + (parseFloat(ele.Volume) * data.currency.BTC).toFixed(2) + '</td>';
            BTCmarketTable.append('<tr>' + tdName + tdBid + tdAsk + tdVolume + '</tr>');
        });
        data.market_data.eth.forEach((ele) => {
            tdName = '<td>' + ele.MarketName + '</td>';
            tdBid = '<td>$' + (parseFloat(ele.Bid) * data.currency.ETH).toFixed(6) + '</td>';
            tdAsk = '<td>$' + (parseFloat(ele.Ask) * data.currency.ETH ).toFixed(6) + '</td>';
            tdVolume = '<td>$' + (parseFloat(ele.Volume) * data.currency.ETH).toFixed(2) + '</td>';
            ETHmarketTable.append('<tr>' + tdName + tdBid + tdAsk + tdVolume + '</tr>');
        });

        data.BTCETH.forEach((ele) => {
            let name = '<td>' + ele.name + '</td>';
            let MARKED = '';
            let PERCENTAGE = parseFloat(ele.percent);

            if (PERCENTAGE > 0.5 && PERCENTAGE < 1) {
                MARKED = 'text-info';
            } else if (PERCENTAGE > 1.0) {
                MARKED = 'text-success';
            } else if (PERCENTAGE > 0 && PERCENTAGE < 0.5) {
                MARKED = 'text-warning';
            } else {
                MARKED = 'text-danger';
            }

            let TDBTCETH = '<td class="' + MARKED + '">' + PERCENTAGE + '%</td>';
            BTCETHProfit.append('<tr>' + name + TDBTCETH + '</tr>');


        });
        data.ETHBTC.forEach((ele) => {
            let name = '<td>' + ele.name + '</td>';
            let MARKED = '';
            let PERCENTAGE = parseFloat(ele.percent);

            if (PERCENTAGE > 0.5 && PERCENTAGE < 1) {
                MARKED = 'text-info';
            } else if (PERCENTAGE > 1.0) {
                MARKED = 'text-success';
            } else if (PERCENTAGE > 0 && PERCENTAGE < 0.5) {
                MARKED = 'text-warning';
            } else {
                MARKED = 'text-danger';
            }
            let TDETHBTC = '<td class="' + MARKED + '">' + PERCENTAGE + '%</td>';
            ETHBTCProfit.append('<tr>' + name + TDETHBTC + '</tr>');

        })
    });
})
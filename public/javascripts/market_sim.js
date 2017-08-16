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
        const SIMdata = $('#MarketSimulator tbody');
        BTCmarketTable.html('');
        ETHmarketTable.html('');
        BTCETHProfit.html('');
        ETHBTCProfit.html('');
        SIMdata.html('');
        let tdBid = '';
        let tdAsk = '';
        let tdVolume = '';
        let tdName = '';
        // let StartingBTC = data.SIM.simData.Starting_Bal;
        // let simTrades = '<td>' + data.SIM.trades + '</td>';
        // let simBTC = '<td>' + data.SIM.simData.BTC + '</td>';
        // let simETH = '<td>' + data.SIM.simData.ETH + '</td>';
        // let GAIN = '<td class="bg-success">Starting: $'+ StartingBTC.toFixed(4) +' - GAIN:'+ ((((data.SIM.simData.BTC ? data.SIM.simData.BTC : data.SIM.simData.ETH) / StartingBTC) - 1)*100).toFixed(6) + '%</td>';
        // SIMdata.append('<tr>' + simTrades + simBTC + simETH + GAIN + '</tr>');
        data.market_data.btc.forEach((ele) => {
            tdName = '<td>' + ele.MarketName + '</td>';
            tdBid = '<td>' + numeral(parseFloat(ele.Bid) * data.currency.BTC).format('$0,0.000000') + '</td>';
            tdAsk = '<td>' + numeral(parseFloat(ele.Ask) * data.currency.BTC).format('$0,0.000000') + '</td>';
            tdVolume = '<td>' + parseFloat(ele.BaseVolume).toFixed(2) + ' (' + numeral(ele.BaseVolume * data.currency.BTC).format('$0.0a') + ')</td>';
            BTCmarketTable.append('<tr>' + tdName + tdBid + tdAsk + tdVolume + '</tr>');
        });
        data.market_data.eth.forEach((ele) => {
            tdName = '<td>' + ele.MarketName + '</td>';
            tdBid = '<td>$' + (parseFloat(ele.Bid) * data.currency.ETH).toFixed(6) + '</td>';
            tdAsk = '<td>$' + (parseFloat(ele.Ask) * data.currency.ETH ).toFixed(6) + '</td>';
            tdVolume = '<td>' + parseFloat(ele.BaseVolume).toFixed(2) + ' (' + numeral(ele.BaseVolume * data.currency.ETH).format('$0.0a') + ')</td>';
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

        });
    });
})
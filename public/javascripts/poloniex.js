// DOM Ready =============================================================

$(document).ready(() => {
    const socket = io();

    socket.emit('get poloniex market');
    socket.emit('get poloniex orders');
    socket.emit('get chart data');
    socket.on('poloniex market', (data) => {
        const BTCmarketTable = $('#BTCmarketTable tbody');
        BTCmarketTable.html('');
        let tdOnePercent = '';
        let tdBuy = '';
        let tdSell = '';
        let tdName = '';
        let tdVol = '';
        let tdPercentChange = '';
        let tdActions = '';
        data.forEach((ele) => {
            let positive = ele.percentChange > 0 ? 'text-success' : 'text-danger';
            tdName = '<td><a href="https://poloniex.com/exchange#' + ele.marketName.toLowerCase() + '" target="_blank">' + ele.marketName + '</a></td>';
            tdBuy = '<td class="text-success">' + numeral(ele.highestBid * 1000).format('0,0.00000') + '</td>';
            tdSell = '<td class="text-danger">' + numeral(ele.lowestAsk * 1000).format('0,0.00000') + '</td>';
            tdOnePercent = '<td class="text-info">' + numeral(ele.highestBid * 1000 * 1.015).format('0,0.00000') + '</td>';
            tdPercentChange = '<td class="' + positive + '">' + numeral(ele.percentChange).format('0.00%') + '</td>';
            tdActions = '<td><button class="btn btn-success btn-sm" id="buy_' + ele.marketName + '">' +
                'BUY @ ' + ele.highestBid + '</button>' + '</td>';
            BTCmarketTable.append('<tr>' + tdName + tdBuy + tdSell + tdOnePercent + tdVol + tdPercentChange + tdActions + '</tr>');
            $('#buy_' + ele.marketName).click(function () {
                let percentage = $('input[name="radioOptions"]:checked').val();
                socket.emit('buy and sell now', {
                    marketName: ele.marketName,
                    percentage: percentage,
                    buy_price: ele.highestBid,
                    sell_price: ele.highestBid * 1.015
                });
            })
        });
    });

    socket.on('poloniex balance', (data) => {
        const balanceTable = $('#PoloBalance tbody');
        balanceTable.html('');
        let tdName = '';
        let tdAvailable = '';
        let tdOnorders = '';
        let btcValue = '';
        let totalBtc = 0;
        data.forEach((ele) => {
            tdName = '<td>' + ele.marketName + '</td>';
            tdAvailable = '<td class="text-success">' + ele.available + '</td>';
            tdOnorders = '<td class="text-primary">' + ele.onOrders + '</td>';
            btcValue = '<td class="text-success btc-value">' + ele.btcValue + '</td>';
            balanceTable.append('<tr>' + tdName + tdAvailable + tdOnorders + btcValue + '</tr>');
        });
        $('.btc-value').each(function () {
            totalBtc += parseFloat($(this).text());
        });
        balanceTable.append('<tr><td>Total BTC</td><td colspan="3" class="text-center" id="totalBtc">' + totalBtc.toFixed(8) + '</td></tr>');
    });

    socket.on('poloniex open orders', (data) => {
        const openOrders = $('#Orders tbody');
        openOrders.html('');
        let tdOrderNumber = '';
        let tdName = '';
        let tdDate = '';
        let tdRate = '';
        let tdType = '';
        let tdAmount = '';
        let tdTotal = '';
        let tdActions = '';
        data.forEach((ele) => {
            tdName = '<td>' + ele.marketName + '</td>';
            ele.orders.forEach((order) => {
                tdOrderNumber = '<td>' + order.orderNumber + '</td>';
                tdDate = '<td>' + order.date + '</td>';
                tdRate = '<td>' + order.rate + '</td>';
                tdType = '<td>' + order.type + '</td>';
                tdAmount = '<td>' + order.amount + '</td>';
                tdTotal = '<td>' + order.total + '</td>';
                tdActions = '<td><button class="btn btn-danger btn-sm" id="cancel_' + order.orderNumber + '">' +
                    'Cancel Order' + '</button>' + '</td>';
                openOrders.append('<tr>' + tdOrderNumber + tdName + tdDate + tdRate + tdType + tdAmount + tdTotal + tdActions + '</tr>');
                $('#cancel_' + order.orderNumber).click(function () {
                    socket.emit('cancel order', order.orderNumber);
                })
            })
        });
    });

    socket.on('alert', (data) => {
        $('body').append(new Alert(data.text, data.priority));
        setTimeout(() => {
            $('.alert').alert('close')
        }, 5000)
    })
})
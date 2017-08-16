$(() => {
    const socket = io();
    let startBtn = $('#startTrade');
    let stopBtn = $('#stopTrade');

    startBtn.click(function () {
        if (!$(this).hasClass('disabled')) {
            socket.emit('start trade')
        }
    });

    stopBtn.click(function () {
        if (!$(this).hasClass('disabled')) {
            socket.emit('stop trade')
        }
    });

    socket.on('btnState', function (data) {
        startBtn.toggleClass("disabled", data.start);
        stopBtn.toggleClass("disabled", data.stop)
    })
});
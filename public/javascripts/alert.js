class Alert {
    constructor(message, level) {
        let alert = $('<div/>', {
            'class': 'alert alert-fixed fade show alert-' + level || 'danger' + ' alert-dismissible',
            'role': 'alert'
        });
        let closeButton = $('<button/>', {
            'class': 'close',
            'data-dismiss': 'alert',
            'aria-label': 'Close'
        }).append('<span aria-hidden="true">&times;</span>');
        return alert.append(closeButton).append(message);
    }
}
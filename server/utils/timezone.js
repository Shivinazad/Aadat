/**
 * Gets today's date at midnight UTC in the client's local timezone.
 * Shifted by the client's offset passed in the 'x-timezone-offset' header.
 */
function getClientToday(req) {
    const offsetHeader = req.headers['x-timezone-offset'];
    const clientOffset = offsetHeader !== undefined ? parseInt(offsetHeader, 10) : new Date().getTimezoneOffset();
    
    const now = new Date();
    // Shift the UTC time by the client's offset to get the client's local time
    const clientTime = new Date(now.getTime() - clientOffset * 60 * 1000);
    clientTime.setUTCHours(0, 0, 0, 0);
    return clientTime;
}

/**
 * Normalizes a database date to midnight UTC in the client's local timezone.
 */
function getClientDateNormalized(date, req) {
    if (!date) return null;
    const offsetHeader = req.headers['x-timezone-offset'];
    const clientOffset = offsetHeader !== undefined ? parseInt(offsetHeader, 10) : new Date().getTimezoneOffset();
    
    // Shift the date to the client's local time
    const clientTime = new Date(date.getTime() - clientOffset * 60 * 1000);
    clientTime.setUTCHours(0, 0, 0, 0);
    return clientTime;
}

module.exports = {
    getClientToday,
    getClientDateNormalized
};

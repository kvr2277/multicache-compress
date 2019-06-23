function isEmpty(obj) {
    if (typeof obj === 'number') return false;
    else if (typeof obj === 'string') return obj.length === 0;
    else if (Array.isArray(obj)) return obj.length === 0;
    else if (typeof obj === 'object') return obj == null || Object.keys(obj).length === 0;
    else if (typeof obj === 'boolean') return false;
    else return !obj;
}

function to(promise) {
    return promise.then(data => {
        //console.log('data is '+JSON.stringify(data));
        return [null, data];
    })
        .catch(err => [err]);
}

const YESNOENUM = Object.freeze({YES:'Y', NO:'N'});

module.exports = {
    isEmpty,
    to,
    YESNOENUM
}
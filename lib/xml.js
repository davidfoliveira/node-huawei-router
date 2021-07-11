const
    http    = require('./http'),
    jscrap  = require('jscrap'),
    util    = require('./util');

exports.get = async (url) => {
    const res = await http.get(url);
    return util.promisify(callback => jscrap.scrap(res.body, (err, $) => {
        $.response = res;
        callback(err, $);
    }));
};

exports.post = async (data) => {
    const res = await http.post(data);
    return util.promisify(callback => jscrap.scrap(res.body, (err, $) => {
        $.response = res;
        callback(err, $);
    }));
};

exports.parse = (content) => {
    return util.promisify(callback => jscrap.scrap(' '+content, callback));
};

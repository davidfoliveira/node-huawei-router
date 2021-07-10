const
    fs       = require('fs'),
    async    = require('async'),
    request  = require('request'),
    util     = require('./util');

exports.get = (url) => util.promisify(callback => {
    if (typeof url === "string") {
        console.log("Getting:", url);
    }
    else {
        console.log("Getting:", url.url);
        url.encoding = 'binary';
    }

    request.get(url, callback);
});

exports.getBuffer = (url) => util.promisify(callback => {
    if (typeof url === "string") {
        console.log("Getting: ", url);
        url = {url, encoding: null};
    }
    else {
        console.log("Getting: ", url.url);
        url.encoding = null;
    }

    request.get(url, (err, res, body) => {
        return err ? callback(err) : res.statusCode !== 200 ? callback(null, null) : callback(null, body);
    });
});

exports.post = (data) => util.promisify(callback => {
    console.log("Posting to: ", data.url);
    request.post(data, callback);
});


exports.download = (url, destinationFile) => util.promisify(callback => {
    const
        urlStr = (typeof(url) === 'object') ? url.url : url,
        opts = (typeof(url) === 'object') ? url : {},
        retries = opts.retries || 0;

    console.log(`Downloading: ${urlStr} into ${destinationFile}`);

    return async.retry(retries, (retryCallback) => {
        let response;
        console.log(`  Trying ${urlStr} ...`);
        request.get(url)
            .on('error', retryCallback)
            .on('response', (res) => {
                response = res;
            })
            .pipe(fs.createWriteStream(destinationFile))
            .on('finish', () => {
                const res = response;
                // Check the destination file length and see if it matches the 'content-length' header... we never know
                if (opts.checkLength && res.headers['content-length'] !== undefined) {
                    return fs.stat(destinationFile, (err, data) => {
                        if (err) {
                            console.log(`Destination file ${destinationFile} stat error: ${err}`);
                            return retryCallback(err);
                        }
                        if (data.size !== parseInt(res.headers['content-length'])) {
                            console.log(`Destination file ${destinationFile} length differ: ${data.size} != ${parseInt(res.headers['content.length'])}`);
                            return retryCallback(new Error("File size differ from content-length"));
                        }
                        return retryCallback(null, res.headers);
                    });
                }
                return retryCallback(null, response.headers);
            })
    }, callback);
});

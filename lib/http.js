exports.get = (opts) => {
    if (typeof opts === 'string')
        opts = { url: opts };
    return this.request({...opts, method: 'GET'});
};

exports.post = (opts, body) => {
    if (typeof opts === 'string')
        opts = { url: opts };
    if (typeof body === 'object')
        body = JSON.stringify(body);
    return this.request({...opts, method: 'POST', body});
};

exports.put = (opts, body) => {
    if (typeof opts === 'string')
        opts = { url: opts };
    if (typeof body === 'object')
        body = JSON.stringify(body);
    return this.request({...opts, method: 'PUT', body});
};

// Promisify the HTTP request
exports.request = (opts) => {
    if (typeof opts === 'string')
        opts = { url: opts };

    return new Promise((resolve, reject) => {
        return this._request(opts, (err, res) => {
            if (err)
                return reject(err);

            // Add our extras
            res.body = () => {
                return new Promise((resolve, reject) => {
                    if (res._rawBody !== undefined)
                        return resolve(res._rawBody);
                    let body = Buffer.alloc(0);
                    res.on('data', (buf) => {
                        body = Buffer.concat([body, buf]);
                    });
                    res.on('end', () => {
                        res._rawBody = body;
                        resolve(body);
                    });
                });
            };
            res.json = async (force=false) => {
                const body = await res.body();
                if (!force && res.headers['content-type'] != 'application/json')
                    throw new Error("Response content-type isn't application/json");
                return JSON.parse(body);
            };
            return err ? reject(err) : resolve(res);
        });
    });
};

exports._request = (opts, callback) => {
    // Parse the url
    console.log("INFO: HTTP Sending request to: ", opts.url);
    const url = new URL(opts.url);
    const mod = url.protocol == 'https:' ? require('https') : require('http');
    const req = mod.request(
        opts.url,
        { ...opts },
        res => callback(null, res)
    );
    req.on('error', (err) => {
        callback(err);
    });
    if (opts.body != null)
        req.write(opts.body);
    req.end();
};

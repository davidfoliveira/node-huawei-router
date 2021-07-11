const
  crypto = require('crypto'),
  http   = require('./http'),
  xml    = require('./xml');


function _fillUpDefaults(opts) {
  if (!opts) opts = {};
  if (!opts.ip) opts.ip = '192.168.1.1';
  if (!opts.username) opts.username = 'admin';
  if (!opts.password) opts.password = 'admin';
  if (opts.followRedirects === undefined) opts.followRedirects = false;
  if (opts.maxRedirects === undefined) opts.maxRedirects = 0;

  return opts;
}

function sha256Sum(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function base64Encode(data) {
  return Buffer.from(data).toString('base64');
}

function getHeader(obj, header) {
  if (!obj || !obj.headers)
    return undefined;
  const val = obj.headers[header.toLowerCase()] || undefined;
  if (typeof val === 'undefined') return val;
  if (val instanceof Array) {
    if (val.length < 1) return undefined;
    return val[0].toString();
  }
  return val;
}

function xmlToObj(el, forceInt=false) {
  const obj = {};
  el.each(childEl => {
    const tag = childEl.tag();
    const val = childEl.text().trim();
    obj[tag] = val.match(/^\d+$/) ? parseInt(val) : val;
  });
  return obj;
}

function Router(opts) {
  this.opts = _fillUpDefaults(opts);
  this.COOKIE = null;
  this.TOKEN = null;
  this._dontPrepareSession = false;
  this._loginPromise = null;
  this._hasLoggedIn = false;
//  this._pendingCalls = [];
}

Router.prototype._prepareSession = async function() {
  this._dontPrepareSession = true;
  const res = await this._request(`/api/webserver/SesTokInfo`, null);
  delete this._dontPrepareSession;

  if (res.statusCode != 200) {
    console.log(`Unexpected SesTokInfo API response ${res.statusCode}: ${res.body}`);
    throw new Error(`Unexpected SesTokInfo API response code: ${res.statusCode}`);
  }

  const xmlRes = await xml.parse(res.body);
  this.COOKIE = xmlRes('SesInfo').text();
  this.TOKEN = xmlRes('TokInfo').text();

  return true;
};

Router.prototype._request = async function (uri, data) {
  // Prepare the session
  if ((!this.COOKIE || !this.TOKEN) && !this._dontPrepareSession) {
    await this._prepareSession();
  }

  let res;
  if (data != null) {
    const req = {
      url: `http://${this.opts.ip}${uri}`,
      headers: {
        ...this.opts.headers,
        '__RequestVerificationToken': this.TOKEN,
        'Cookie': this.COOKIE,
        'Content-Length': data.length,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
      },
      form: data,
      followRedirects: this.opts.followRedirects,
      maxRedirects: this.opts.maxRedirects,
    };
    if (this.opts.debug) console.log(`Sending request: `, req);
    res = await http.post(req);
  }
  else {
    const req = {
      url: `http://${this.opts.ip}${uri}`,
      headers: {
        ...this.opts.headers,
        Cookie: this.COOKIE,
      },
      followRedirects: this.opts.followRedirects,
      maxRedirects: this.opts.maxRedirects,
    };
    if (this.opts.debug) console.log(`Sending request: `, req);
    res = await http.get(req);
  }

  if (res.statusCode !== 200) {
    console.log(`Unexpected response from '${uri}' API with code ${res.statusCode}: ${res.body}`);
    throw new Error(`Unexpected response from '${uri}' API with code ${res.statusCode}`);
  }
  if (res.body.match(/<error>/)) {
    console.log(`Found an XML error in the '${uri}' API response: ${res.body}`);
    throw new Error(`Found an XML error in the '${uri}' API response: ${res.body}`);
  }

  if (this.opts.debug) {
    console.log("Got headers: ", res.headers);
    console.log("Got body: ", res.body);
  }

  // Get new cookie and new token
  const _COOKIE = getHeader(res, 'set-cookie');
  if (_COOKIE) this.COOKIE = _COOKIE.replace(/;.*$/, '');
  const _TOKEN = getHeader(res, '__requestverificationtoken');
  if (_TOKEN) this.TOKEN = _TOKEN.trim();
  const _TOKEN2 = getHeader(res, '__requestverificationtokentwo');
  if (_TOKEN2) this.TOKEN = _TOKEN2.trim();

  return res;
};

Router.prototype._requestWithAuth = async function (uri, data) {
  // If never logged in, login first
  if (!this._hasLoggedIn) {
    await this.login(this.opts.username, this.opts.password);
  }

  // Try twice (one might fail, asking for reLogin)
  let attempts = 2;
  let res;
  while (attempts--) {
    try {
      res = await this._request(uri, data);
    }
    catch(ex) {
      // Should we reLogin?
      if (ex.toString().match(/<code>(100003|125002)<\/code>/) && this.opts.username && this.opts.password) {
        await this.login(this.opts.username, this.opts.password);
        continue;
      }
      throw ex;
    }
    return res;
  }
};

Router.prototype.login = async function(username, password) {
  if (this._loginPromise) {
    return this._loginPromise;
  }

  // Create a promise so other calls that require login can wait for it
  const loginPromise = { };
  this._loginPromise = new Promise((res, rej) => {
    loginPromise.resolve = res;
    loginPromise.reject  = rej;
  });

  // Prepare the session
  if (!this.COOKIE || !this.TOKEN) {
    await this._prepareSession();
  }

  // Store the credentials for later
  if (!this.opts.dontStoreCredentials) {
    this.opts.username = username;
    this.opts.password = password;
  }

  // Build the login payload
  const pwd = base64Encode(sha256Sum(password));
  const xmlPassword = base64Encode(sha256Sum(`${username}${pwd}${this.TOKEN}`));
  const loginXML = `<?xml version="1.0" encoding="UTF-8"?><request><Username>${username}</Username><Password>${xmlPassword}</Password><password_type>4</password_type></request>`;

  // Login
  try {
    await this._request(`/api/user/login`, loginXML);
  }
  catch(ex) {
    loginPromise.reject();
    throw ex;
  }

  loginPromise.resolve();
  this._hasLoggedIn = true;
  return true;
};

Router.prototype.getBasicInfo = async function() {
  const res = await this._request('/api/device/basic_information', null);
  const xmlRes = await xml.parse(res.body);
  return xmlToObj(xmlRes('response > *'));
};

Router.prototype.getDeviceInfo = async function() {
  const res = await this._requestWithAuth('/api/device/information', null);
  const xmlRes = await xml.parse(res.body);
  return xmlToObj(xmlRes('response > *'));
};

Router.prototype.getSystemInfo = async function() {
  const res = await this._request('/api/system/deviceinfo', null);
  return JSON.parse(res.body);
};

Router.prototype.getMobileNetworkInfo = async function() {
  const res = await this._request('/api/net/current-plmn', null);
  const xmlRes = await xml.parse(res.body);
  return xmlToObj(xmlRes('response > *'));
};

Router.prototype.getStatus = async function() {
  const res = await this._request('/api/monitoring/status', null);
  const xmlRes = await xml.parse(res.body);
  return xmlToObj(xmlRes('response > *'));
};

Router.prototype.getInboxStats = async function() {
  const res = await this._request('/api/monitoring/check-notifications', null);
  const xmlRes = await xml.parse(res.body);
  return xmlToObj(xmlRes('response > *'));
};

Router.prototype.getSMSStats = async function() {
  // Count SMSs
  const res = await this._request('/api/sms/sms-count', null);
  const xmlRes = await xml.parse(res.body);
  return xmlToObj(xmlRes('response > *'), true);
};

Router.prototype.listSMS = async function(opts, count) {
  // Get SMS stats first
  if (!count) {
    const stats = await this.getSMSStats(opts);
    count = stats.localinbox;
  }

  // List them
  const listSMSRequest = `<?xml version="1.0" encoding="UTF-8"?><request><PageIndex>1</PageIndex><ReadCount>${count}</ReadCount><BoxType>1</BoxType><SortType>0</SortType><Ascending>0</Ascending><UnreadPreferred>0</UnreadPreferred></request>`;
  const res = await this._requestWithAuth('/api/sms/sms-list', listSMSRequest, opts);
  const xmlRes = await xml.parse(res.body);
  const messages = [];
  xmlRes('response > messages > message').each(messageEl => {
    messages.push(xmlToObj(messageEl.find('> *')));
  });
  return messages;
};

exports.HuaweiRouter = Router;

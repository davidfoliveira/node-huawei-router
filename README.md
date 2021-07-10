# huawei-router

A node.js simple API for Huawei Router and Hotspots.

## Usage

	const { HuaweiRouter } = require('huawei-router');
	const router = new HuaweiRouter({
	  ip: '192.168.1.1', // default IP address
	  username: 'admin', // default username
	  password: 'admin', // default password
	});

	(async () => {
	  console.log("Router info:", await router.getSystemInfo());
	})();


## Supported options

- ip
- username
- password
- headers - An object containing the HTTP headers to send; `{}` by default;
- followRedirects - If the internal HTTP client should follow redirections; `false` by default;
- maxRedirects - In case `followRedirects` is on, how many redirects should it follow at max;


## API methods

### getBasicInfo()

Returns the device basic information (/api/device/basic_information)

### getDeviceInfo()

Returns the device information (/api/device/information)

### getSystemInfo()

Returns the system information (/api/system/deviceinfo)

### getMobileNetworkInfo()

Returns the mobile network information (/api/net/current-plmn)

### getStatus()

Returns the monitoring status (/api/monitoring/status)

### getInboxStats()

Returns the statistics of device's inbox [number of messages, etc...] (/api/monitoring/check-notifications)

### getSMSStats()

Returns the statistics about SMS messages in the device (/api/sms/sms-count)

### listSMS([numberOfMessages])

Returns the SMS messages in the device up to a specified number. If the number isn't specified, it'll return them all (/api/sms/sms-list)

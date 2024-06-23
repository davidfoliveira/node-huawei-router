#!/usr/bin/env node

const { HuaweiRouter } = require('..');
const router = new HuaweiRouter({
  username: process.env.HUAWEI_USERNAME || 'admin',
  password: process.env.HUAWEI_PASSWORD || 'admin',
  ip: process.env.HUAWEI_HOST || '192.168.0.1',
  headers: {'Host': process.env.HUAWEI_HOST || '192.168.0.1'},
  debug: true,
});

(async () => {

  console.log("Router info:", await router.getSystemInfo());
  console.log("Mobile network info: ", await router.getMobileNetworkInfo());
  console.log("Basic info: ", await router.getBasicInfo());
  console.log("Device info: ", await router.getDeviceInfo());
  console.log("System info: ", await router.getSystemInfo());
  console.log("Status: ", await router.getStatus());

  console.log("Messages: ", await router.listSMS(null, 1, 10));

  console.log("Logout: ", await router.logout());

})();

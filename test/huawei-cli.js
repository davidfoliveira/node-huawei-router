#!/usr/bin/env node

const { HuaweiRouter } = require('..');
const router = new HuaweiRouter({
  username: process.env.HUAWEI_USERNAME || 'admin',
  password: process.env.HUAWEI_PASSWORD || 'admin',
  ip: '10.2.2.18',
  headers: {'Host': '192.168.1.1'},
});

(async () => {
  console.log("Router info:", await router.getSystemInfo());
  console.log("Mobile network info: ", await router.getMobileNetworkInfo());
  console.log("Basic info: ", await router.getBasicInfo());
  console.log("Device info: ", await router.getDeviceInfo());
  console.log("System info: ", await router.getSystemInfo());
  console.log("Status: ", await router.getStatus());
})();

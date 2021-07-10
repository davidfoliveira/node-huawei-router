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
})();
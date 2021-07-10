const crypto = require('crypto');

// eslint-disable-next-line max-len, no-confusing-arrow
exports.promisify = func => new Promise((fulfill, reject) => func((error, ...args) => error ? reject(error) : fulfill.call(error, ...args)));
exports.promisifyArray = func => new Promise((fulfill, reject) => func((error, [...args]) => error ? reject(error) : fulfill.call(error, ...args)));

// For each value in an array, call a function which returns a promise.
// Waits for promises, keeping a certain (or not) number of concurrent promises
exports.eachPromise = (array, fn, concurrents) => {
  // No number of concurrent promises? Just run them all!
  if (!concurrents) {
    return Promise.all(array.map((item) => fn(item)));
  }

  // Shall we keep a certain number of concurrent promises?
  return new Promise((fulfill, reject) => {
    const
      promises = [],
      outputs = [];
    let
      nextPromise = 0,
      finishedPromises = 0;
    const
      runNextPromise = () => {
        const curPromise = nextPromise++;
        promises[curPromise] = fn(array[curPromise]);
        promises[curPromise].then((res) => {
          finishedPromises++;
          outputs[curPromise] = res;
          if (finishedPromises == array.length) {
            return fulfill(outputs);
          }
          if (nextPromise < array.length) {
            return runNextPromise();
          }
        });
      };

    // Run the maximum number of promises we can
    for(let x = 0; x < concurrents && x < array.length; x++) {
      runNextPromise();
    }
  });
};

// Get the MD5 hex digest
exports.md5Hex = (data) => crypto.createHash('md5').update(data).digest('hex');

// Cached decorator
const cache = { };
exports.cached = (fn, expireTime) => {
  return async (...args) => {
    const cacheKey = `${exports.md5Hex(fn.toString())}:${args.join(' // ')}`;
    if (cache[cacheKey])
      return cache[cacheKey];

    // Call the function
    const result = await fn(...args);

    // Store it  
    cache[cacheKey] = result;
    setTimeout(() => {
      delete cache[cacheKey];
    }, expireTime);

    return result;
  };
};

// Creates a new object from another one
exports.dotDotDot = (obj) => {
  const newObj = { };
  Object.keys(obj).forEach(prop => {
    newObj[prop] = obj[prop];
  })
  return newObj;
};
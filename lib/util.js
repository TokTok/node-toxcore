/*
 * This file is part of node-toxcore.
 *
 * node-toxcore is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * node-toxcore is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with node-toxcore. If not, see <http://www.gnu.org/licenses/>.
 *
 */

require("buffer");
//var os = require("os");
var _ = require("underscore");

/**
 * Convert a hex string to a Buffer. If not a string, will just
 * return what's passed to it.
 * @param {String} hex - Hex string
 * @return {Buffer} data
 */
var fromHex = function(hex) {
  if(_.isString(hex)) {
    return (Buffer.from(hex, "hex"));
  }
  return hex;
};

/**
 * Try to parse an address:port string.
 * @return {Object} Object with address and port if successful,
 *                  undefined if not.
 */
var parseAddress = function(str) {
  var ex = /^[^:]+:(\\d+)$/;
  if(ex.test(str)) {
    var res = ex.exec(str);
    return {
      address: res[1],
      port: res[2]
    };
  }
};

/**
 * Try to parse a Tox proxy string.
 * @return {Object} Proxy object if successful, undefined if not
 */
var parseProxy = function(str) {
  var type;
  if(str.indexOf("http://") === 0) {
    str = str.slice("http://".length);
    type = "http";
  } else if(str.indexOf("socks://") === 0) {
    str = str.slice("socks://".length);
    type = "socks";
  } else if(str.indexOf("socks5://") === 0) {
    str = str.slice("socks5://".length);
    type = "socks";
  }

  var proxy = parseAddress(str);
  if(proxy) {
    proxy.type = type;
    return proxy;
  }
};

/**
 * Get a "size_t type" (Buffer) from a Number.
 * @param {Number} value
 * @return {String} size_t
 */
var size_t = function(value) {
  return value.toString();
  /*
  if(isNaN(value)) {
    // @todo: Throw error
  } else if(value < 0) {
    // @todo: Throw error
  }

  var size = ref.alloc("size_t"),
      e = os.endianness();

  size.fill(0);

  // @todo: Fix for 64-bit integers?
  if(size.length === 8) {
    if(e === "BE") {
      size.writeUInt32BE(value, 4);
    } else {
      size.writeUInt32LE(value, 0);
    }
  } else if(size.length === 4) {
    if(e === "BE") {
      size.writeUInt32BE(value, 0);
    } else {
      size.writeUInt32LE(value, 0);
    }
  } else if (size.length === 2) {
    if(e === "BE") {
      size.writeUInt16BE(value, 0);
    } else {
      size.writeUInt16LE(value, 0);
    }
  } else if (size.length === 1) {
    size.writeUInt8(value, 0);
  } else {
    // @todo: Throw
  }

  return size;
  */
};

/**
 * Helper for async functions that pass data through a callback in
 * the form of (Error, Buffer). Will translate the Buffer to a hex
 * String and pass that instead.
 * @param {Function} asyncFunc Asynchronous function to call
 * @param {Callback} callback
 */
var hexify = function(asyncFunc, callback) {
  asyncFunc(function(err, buffer) {
    if(callback) {
      callback(err, buffer.toString("hex"));
    }
  });
};

/**
 * Helper for sync functions that return a Buffer. Will translate
 * the Buffer to a hex String and return that instead.
 * @param {Function} syncFunction Synchronous function to get Buffer from
 */
var hexifySync = function(syncFunction) {
  var addr = syncFunction();
  return addr.toString("hex");
};

/**
 * Get a Date object from some UInt64. Expects the UInt64 to be represented
 * as either a Number or String.
 * @param {(Number|String)} timeval
 * @return Date object, if timeval is less than 1 or a String this will be (new Date(NaN))
 */
var getDateFromUInt64 = function(timeval) {
  // According to tox.h, timeval will be a unix-time timestamp,
  // so seconds -> milliseconds
  var date = new Date(NaN);
  if(_.isNumber(timeval) && timeval >= 1) {
    date = new Date(timeval * 1000);
  }
  return date;
};

module.exports = {
  fromHex: fromHex,
  getDateFromUInt64: getDateFromUInt64,
  hexify: hexify,
  hexifySync: hexifySync,
  parseProxy: parseProxy,
  size_t: size_t
};

#!/usr/bin/env node
/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright © 2016-2020 The TokTok team.
 * Copyright © 2014-2016 saneki <s@neki.me>
 */

var fs = require("fs");
var toxcore = require("js-toxcore-c");

var crypto = new toxcore.ToxEncryptSave();
var passphrase = "helloWorld";

/**
 * Encrypt some data at write it to a file.
 * @param {String} filepath - Path of file to write to
 * @param {Buffer} data - Data to encrypt and write
 */
var encrypt = function (filepath, data) {
  crypto.encryptFile(filepath, data, passphrase, function (err) {
    if (!err) {
      console.log("Successfully encrypted file!");
    } else {
      console.error("Unable to encrypt file", err);
    }
  });
};

/**
 * Decrypt some data and write it to a file.
 * @param {String} filepath - Path of file to write to
 * @param {Buffer} data - Data to decrypt and write
 */
var decrypt = function (filepath, data) {
  crypto.decrypt(data, passphrase, function (err, ddata) {
    if (!err) {
      fs.writeFile(filepath, ddata, function (err) {
        if (!err) {
          console.log("Successfully decrypted file!");
        } else {
          console.error("Unable to write decrypted data to the file", err);
        }
      });
    } else {
      console.error("Unable to decrypt data with passphrase", err);
    }
  });
};

/**
 * Given a file, encrypt it (if not yet encrypted) or decrypt it
 * (if already encrypted).
 * @param {String} filepath - Path of file
 */
var performCrypto = function (filepath) {
  fs.readFile(filepath, function (err, data) {
    if (!err) {
      crypto.isDataEncrypted(data, function (err, isEncrypted) {
        if (!err) {
          if (isEncrypted) {
            decrypt(filepath, data);
          } else {
            encrypt(filepath, data);
          }
        } else {
          console.error("Unable to determine if data is encrypted", err);
        }
      });
    } else {
      console.error("Unable to read input file", err);
    }
  });
};

var args = process.argv.slice(2);
if (args.length > 0) {
  var filepath = args[0];
  performCrypto(filepath);
} else {
  console.error("usage: node crypto-example.js <filepath>");
}

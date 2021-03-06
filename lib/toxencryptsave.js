/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright © 2016-2020 The TokTok team.
 * Copyright © 2014-2016 saneki <s@neki.me>
 */

var ffi = require("ffi-napi");
var fs = require("fs");
var path = require("path");
var ref = require("ref-napi");
var RefArray = require("ref-array-napi");
var RefStruct = require("ref-struct-napi");
var _ = require("underscore");

var consts = require(path.join(__dirname, "consts"));
var errors = require(path.join(__dirname, "errors"));

var ToxPassKey = RefStruct({
  salt: RefArray("uint8", consts.TOX_PASS_SALT_LENGTH),
  key: RefArray("uint8", consts.TOX_PASS_KEY_LENGTH),
});

// Common types
var UInt8Ptr = ref.refType("uint8");

// Tox enums and error types
var CEnum = "int32";
var TOX_ERR_DECRYPTION = CEnum;
var TOX_ERR_ENCRYPTION = CEnum;
var TOX_ERR_KEY_DERIVATION = CEnum;
var TOX_ERR_GET_SALT = CEnum;

/**
 * Creates a ToxEncryptSave instance.
 * @class
 * @param {(Object|String)} [opts] Options
 */
var ToxEncryptSave = function (opts) {
  // If opts is a string, assume libpath
  if (_.isString(opts)) {
    opts = { path: opts };
  }

  if (!opts) opts = {};
  var libpath = opts["path"];

  this._library = this._createLibrary(libpath);
};

/**
 * @private
 */
ToxEncryptSave.prototype._createLibrary = function (libpath) {
  libpath = libpath || "libtoxcore";
  return ffi.Library(libpath, {
    tox_pass_key_derive: [
      ref.refType(ToxPassKey),
      [UInt8Ptr, "size_t", ref.refType(TOX_ERR_KEY_DERIVATION)],
    ],
    tox_pass_key_derive_with_salt: [
      ref.refType(ToxPassKey),
      [UInt8Ptr, "size_t", UInt8Ptr, ref.refType(TOX_ERR_KEY_DERIVATION)],
    ],
    tox_get_salt: ["bool", [UInt8Ptr, UInt8Ptr, ref.refType(TOX_ERR_GET_SALT)]],
    tox_is_data_encrypted: ["bool", [UInt8Ptr]],
    tox_pass_decrypt: [
      "bool",
      [UInt8Ptr, "size_t", UInt8Ptr, "size_t", UInt8Ptr, ref.refType(TOX_ERR_DECRYPTION)],
    ],
    tox_pass_encrypt: [
      "bool",
      [UInt8Ptr, "size_t", UInt8Ptr, "size_t", UInt8Ptr, ref.refType(TOX_ERR_ENCRYPTION)],
    ],
    tox_pass_key_decrypt: [
      "bool",
      [ref.refType(ToxPassKey), UInt8Ptr, "size_t", UInt8Ptr, ref.refType(TOX_ERR_DECRYPTION)],
    ],
    tox_pass_key_encrypt: [
      "bool",
      [ref.refType(ToxPassKey), UInt8Ptr, "size_t", UInt8Ptr, ref.refType(TOX_ERR_ENCRYPTION)],
    ],
  });
};

/**
 * Asynchronous tox_pass_decrypt(3).
 * @param {Buffer} data - Data to decrypt
 * @param {(Buffer|String)} pass - Password to decrypt with
 * @param {ToxEncryptSave~dataCallback} [callback]
 */
ToxEncryptSave.prototype.decrypt = function (data, pass, callback) {
  if (_.isString(pass)) pass = Buffer.from(pass);
  var eptr = ref.alloc(TOX_ERR_DECRYPTION),
    out = Buffer.alloc(data.length - consts.TOX_PASS_ENCRYPTION_EXTRA_LENGTH);
  this.getLibrary().tox_pass_decrypt.async(
    data,
    data.length,
    pass,
    pass.length,
    out,
    eptr,
    function (err, success) {
      var terr = errors.decryption(eptr.deref());
      if (!err && terr) err = terr;
      if (!err && !success) err = errors.unsuccessful();
      if (callback) {
        callback(err, out);
      }
    }
  );
};

/**
 * Synchronous tox_pass_decrypt(3).
 * @param {Buffer} data - Data to decrypt
 * @param {(Buffer|String)} pass - Password to decrypt with
 * @return {Buffer} Decrypted data
 */
ToxEncryptSave.prototype.decryptSync = function (data, pass) {
  if (_.isString(pass)) pass = Buffer.from(pass);
  var eptr = ref.alloc(TOX_ERR_DECRYPTION),
    out = Buffer.alloc(data.length - consts.TOX_PASS_ENCRYPTION_EXTRA_LENGTH),
    success = this.getLibrary().tox_pass_decrypt(data, data.length, pass, pass.length, out, eptr);
  var err = errors.decryption(eptr.deref());
  if (err) throw err;
  else if (!success) throw errors.unsuccessful();
  return out;
};

/**
 * Asynchronous tox_pass_encrypt(3).
 * @param {Buffer} data - Data to encrypt
 * @param {(Buffer|String)} pass - Password to encrypt with
 * @param {ToxEncryptSave~dataCallback} [callback]
 */
ToxEncryptSave.prototype.encrypt = function (data, pass, callback) {
  if (_.isString(pass)) pass = Buffer.from(pass);
  var eptr = ref.alloc(TOX_ERR_ENCRYPTION),
    out = Buffer.alloc(data.length + consts.TOX_PASS_ENCRYPTION_EXTRA_LENGTH);
  this.getLibrary().tox_pass_encrypt.async(
    data,
    data.length,
    pass,
    pass.length,
    out,
    eptr,
    function (err, success) {
      var terr = errors.encryption(eptr.deref());
      if (!err && terr) err = terr;
      if (!err && !success) err = errors.unsuccessful();
      if (callback) {
        callback(err, out);
      }
    }
  );
};

/**
 * Synchronous tox_pass_encrypt(3).
 * @param {Buffer} data - Data to encrypt
 * @param {(Buffer|String)} pass - Password to encrypt with
 * @return {Buffer} Encrypted data
 */
ToxEncryptSave.prototype.encryptSync = function (data, pass) {
  if (_.isString(pass)) pass = Buffer.from(pass);
  var eptr = ref.alloc(TOX_ERR_ENCRYPTION),
    out = Buffer.alloc(data.length + consts.TOX_PASS_ENCRYPTION_EXTRA_LENGTH),
    success = this.getLibrary().tox_pass_encrypt(data, data.length, pass, pass.length, out, eptr);
  var err = errors.encryption(eptr.deref());
  if (err) throw err;
  else if (!success) throw errors.unsuccessful();
  return out;
};

/**
 * Asynchronous tox_get_salt(3).
 * @param {Buffer} data - Data to get salt from
 * @param {ToxEncryptSave~dataCallback} [callback]
 */
ToxEncryptSave.prototype.getSalt = function (data, callback) {
  var salt = Buffer.alloc(consts.TOX_PASS_SALT_LENGTH),
    eptr = ref.alloc(TOX_ERR_GET_SALT);
  this.getLibrary().tox_get_salt.async(data, salt, eptr, function (err, success) {
    if (!err && !success) err = errors.unsuccessful();
    if (callback) {
      callback(err, salt);
    }
  });
};

/**
 * Synchronous tox_get_salt(3).
 * @param {Buffer} data - Data to get salt from
 * @return {Buffer} Salt
 */
ToxEncryptSave.prototype.getSaltSync = function (data) {
  var salt = Buffer.alloc(consts.TOX_PASS_SALT_LENGTH),
    eptr = ref.alloc(TOX_ERR_GET_SALT),
    success = this.getLibrary().tox_get_salt(data, salt, eptr);
  if (!success) throw errors.unsuccessful();
  return salt;
};

/**
 * Asynchronous tox_is_data_encrypted(3).
 * @param {Buffer} data - Data to check
 * @param {ToxEncryptSave~booleanCallback} [callback]
 */
ToxEncryptSave.prototype.isDataEncrypted = function (data, callback) {
  this.getLibrary().tox_is_data_encrypted.async(data, function (err, val) {
    if (callback) {
      callback(err, val);
    }
  });
};

/**
 * Synchronous tox_is_data_encrypted(3).
 * @param {Buffer} data - Data to check
 * @return {Boolean} true if data is encrypted, false if not
 */
ToxEncryptSave.prototype.isDataEncryptedSync = function (data) {
  return this.getLibrary().tox_is_data_encrypted(data);
};

/**
 * Asynchronous tox_pass_key_derive(3).
 * @param {(Buffer|String)} pass - Password to derive key from
 * @param {ToxEncryptSave~passKeyCallback} [callback]
 */
ToxEncryptSave.prototype.deriveKeyFromPass = function (pass, callback) {
  this._performDerive({
    api: this.getLibrary().tox_pass_key_derive.async,
    pass: pass,
    useSalt: false,
    async: true,
    callback: callback,
  });
};

/**
 * Synchronous tox_pass_key_derive(3).
 * @param {(Buffer|String)} pass - Password to derive key from
 * @return {ToxPassKey} Object containing a key and a salt
 */
ToxEncryptSave.prototype.deriveKeyFromPassSync = function (pass) {
  return this._performDerive({
    api: this.getLibrary().tox_pass_key_derive,
    pass: pass,
    useSalt: false,
    async: false,
  });
};

/**
 * Asynchronous tox_pass_key_derive_with_salt(3).
 * @param {(Buffer|String)} pass - Password to derive key from
 * @param {Buffer} salt - Salt to use
 * @param {ToxEncryptSave~passKeyCallback} [callback]
 */
ToxEncryptSave.prototype.deriveKeyWithSalt = function (pass, salt, callback) {
  this._performDerive({
    api: this.getLibrary().tox_pass_key_derive_with_salt.async,
    pass: pass,
    salt: salt,
    useSalt: true,
    async: true,
    callback: callback,
  });
};

/**
 * Synchronous tox_pass_key_derive_with_salt(3).
 * @param {(Buffer|String)} pass - Password to derive key from
 * @param {Buffer} salt - Salt to use
 * @return {PassKeyObject} Object containing a key and a salt
 */
ToxEncryptSave.prototype.deriveKeyWithSaltSync = function (pass, salt) {
  return this._performDerive({
    api: this.getLibrary().tox_pass_key_derive_with_salt,
    pass: pass,
    salt: salt,
    useSalt: true,
    async: false,
  });
};

/**
 * Asynchronous tox_pass_key_encrypt(3).
 * @param {Buffer} data - Data to encrypt
 * @param {ToxPassKey} passKey
 * @param {ToxEncryptSave~dataCallback} [callback]
 */
ToxEncryptSave.prototype.encryptPassKey = function (data, passKey, callback) {
  var out = Buffer.alloc(data.length + consts.TOX_PASS_ENCRYPTION_EXTRA_LENGTH),
    eptr = ref.alloc(TOX_ERR_ENCRYPTION);
  this.getLibrary().tox_pass_key_encrypt.async(
    passKey.ref(),
    data,
    data.length,
    out,
    eptr,
    function (err, success) {
      var terr = errors.encryption(eptr.deref());
      if (!err && terr) err = terr;
      if (!err && !success) err = errors.unsuccessful();
      if (callback) {
        callback(err, out);
      }
    }
  );
};

/**
 * Synchronous tox_pass_key_encrypt(3).
 * @param {Buffer} data - Data to encrypt
 * @param {ToxPassKey} passKey
 * @return {Buffer} Encrypted data
 */
ToxEncryptSave.prototype.encryptPassKeySync = function (data, passKey) {
  var out = Buffer.alloc(data.length + consts.TOX_PASS_ENCRYPTION_EXTRA_LENGTH),
    eptr = ref.alloc(TOX_ERR_ENCRYPTION),
    success = this.getLibrary().tox_pass_key_encrypt(passKey.ref(), data, data.length, out, eptr);
  var err = errors.encryption(eptr.deref());
  if (err) throw err;
  else if (!success) throw errors.unsuccessful();
  return out;
};

/**
 * Asynchronous tox_pass_key_decrypt(3).
 * @param {Buffer} data - Data to decrypt
 * @param {ToxPassKey} passKey
 * @param {ToxEncryptSave~dataCallback} [callback]
 */
ToxEncryptSave.prototype.decryptPassKey = function (data, passKey, callback) {
  var out = Buffer.alloc(data.length - consts.TOX_PASS_ENCRYPTION_EXTRA_LENGTH),
    eptr = ref.alloc(TOX_ERR_DECRYPTION);
  this.getLibrary().tox_pass_key_decrypt.async(
    passKey.ref(),
    data,
    data.length,
    out,
    eptr,
    function (err, success) {
      var terr = errors.decryption(eptr.deref());
      if (!err && terr) err = terr;
      if (!err && !success) err = errors.unsuccessful();
      if (callback) {
        callback(err, out);
      }
    }
  );
};

/**
 * Synchronous tox_pass_key_decrypt(3).
 * @param {Buffer} data - Data to decrypt
 * @param {ToxPassKey} passKey
 * @return {Buffer} Decrypted data
 */
ToxEncryptSave.prototype.decryptPassKeySync = function (data, passKey) {
  var out = Buffer.alloc(data.length - consts.TOX_PASS_ENCRYPTION_EXTRA_LENGTH),
    eptr = ref.alloc(TOX_ERR_DECRYPTION),
    success = this.getLibrary().tox_pass_key_decrypt(passKey.ref(), data, data.length, out, eptr);
  var err = errors.decryption(eptr.deref());
  if (err) throw err;
  else if (!success) throw errors.unsuccessful();
  return out;
};

/**
 * Asynchronously write data encrypted with a passphrase to a file.
 * @param {String} filepath - Filepath
 * @param {Buffer} data - Data to encrypt and write
 * @param {(Buffer|String)} pass - Passphrase
 * @param {ToxEncryptSave~errCallback} [callback]
 */
ToxEncryptSave.prototype.encryptFile = function (filepath, data, pass, callback) {
  this.encrypt(data, pass, function (err, edata) {
    if (!err) {
      fs.writeFile(filepath, edata, callback);
    } else if (callback) {
      callback(err);
    }
  });
};

/**
 * Synchronously write data encrypted with a passphrase to a file.
 * @param {String} filepath - Filepath
 * @param {Buffer} data - Data to encrypt and write
 * @param {(Buffer|String)} pass - Passphrase
 */
ToxEncryptSave.prototype.encryptFileSync = function (filepath, data, pass) {
  var edata = this.encryptSync(data, pass);
  fs.writeFileSync(filepath, edata);
};

/**
 * Asynchronously decrypt a file with a passphrase.
 * @param {String} filepath - Filepath
 * @param {(Buffer|String)} pass - Passphrase
 * @param {ToxEncryptSave~dataCallback} [callback]
 */
ToxEncryptSave.prototype.decryptFile = function (filepath, pass, callback) {
  var crypto = this;
  fs.readFile(filepath, function (err, data) {
    if (!err) {
      crypto.decrypt(data, pass, callback);
    } else if (callback) {
      callback(err);
    }
  });
};

/**
 * Synchronously decrypt a file with a passphrase.
 * @param {String} filepath - Filepath
 * @param {(Buffer|String)} pass - Passphrase
 * @return {Buffer} Decrypted file data
 */
ToxEncryptSave.prototype.decryptFileSync = function (filepath, pass) {
  var data = fs.readFileSync(filepath);
  return this.decryptSync(data, pass);
};

/**
 * Get the internal Library instance.
 * @return {ffi.Library}
 */
ToxEncryptSave.prototype.getLibrary = function () {
  return this._library;
};

/**
 * Helper wrapper function for key derivation functions.
 * @private
 */
ToxEncryptSave.prototype._performDerive = function (opts) {
  var api = opts["api"],
    pass = opts["pass"],
    salt = opts["salt"],
    useSalt = opts["useSalt"],
    async = opts["async"],
    callback = opts["callback"];

  if (_.isString(pass)) pass = Buffer.from(pass);
  var out = ref.alloc(ToxPassKey),
    eptr = ref.alloc(TOX_ERR_KEY_DERIVATION);

  if (useSalt) {
    api = api.bind(undefined, pass, pass.length, salt, eptr);
  } else {
    api = api.bind(undefined, pass, pass.length, eptr);
  }

  if (async) {
    api(function (err, success) {
      var terr = errors.keyDerivation(eptr.deref());
      if (!err && terr) err = terr;
      if (!err && !success) err = errors.unsuccessful();
      if (callback) {
        if (!err) {
          callback(err, out.deref());
        } else {
          callback(err);
        }
      }
    });
  } else {
    var success = api(),
      err = errors.keyDerivation(eptr.deref());
    if (err) throw err;
    else if (!success) throw errors.unsuccessful();
    return out.deref();
  }
};

/**
 * Callback that returns some boolean.
 * @callback ToxEncryptSave~booleanCallback
 * @param {Error} error - error, if any
 * @param {Boolean} value
 */

/**
 * Callback that returns some data in a Buffer.
 * @callback ToxEncryptSave~dataCallback
 * @param {Error} error - error, if any
 * @param {Buffer} data
 */

/**
 * Callback that returns a ToxPassKey struct (containing a key and a salt).
 * @callback ToxEncryptSave~passKeyCallback
 * @param {Error} error - error, if any
 * @param {ToxPassKey} passKey - ToxPassKey struct to use in other ToxEncryptSave methods
 */

module.exports = ToxEncryptSave;

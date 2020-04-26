/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright © 2016-2020 The TokTok team.
 * Copyright © 2014-2016 saneki <s@neki.me>
 */

var assert = require("assert");
var fs = require("fs");
var mktemp = require("mktemp");
var path = require("path");
var should = require("should");

function loadModule(mod) {
  try {
    return require(path.join("js-toxcore-c", "js-toxcore-c", "js-toxcore-c", "lib", mod));
  } catch (e) {
    return require(path.join(__dirname, "..", "lib", mod));
  }
}

var ToxEncryptSave = loadModule("toxencryptsave");
var consts = loadModule("consts");

require("buffer");

// Helper mktemp functions
var mktempToxSync = mktemp.createFileSync.bind(undefined, "XXXXX.tox");

var toxPassKeyToObject = function (passKey) {
  return { key: Buffer.from(passKey.key), salt: Buffer.from(passKey.salt) };
};

describe("ToxEncryptSave", function () {
  var crypto = new ToxEncryptSave();

  describe("encryption and decryption", function () {
    it("should detect encrypted data", function () {
      var data = Buffer.from("hello world"),
        edata = crypto.encryptSync(data, "somePassphrase");
      crypto.isDataEncryptedSync(edata).should.be.true;
    });

    it("should detect encrypted data (async)", function (done) {
      var data = Buffer.from("hello async world");
      crypto.encrypt(data, "someAsyncPassphrase", function (err, edata) {
        if (!err) {
          crypto.isDataEncrypted(edata, function (err, isEnc) {
            if (!err) {
              isEnc.should.be.true;
              done();
            } else done(err);
          });
        } else done(err);
      });
    });

    it("should be able to decrypt encrypted data", function () {
      var data = Buffer.from("some encrypted data"),
        passphrase = "somePassphrase",
        edata = crypto.encryptSync(data, passphrase);

      // Encrypted data should differ from original
      edata.should.be.a.Buffer;
      edata.equals(data).should.be.false;

      var ddata = crypto.decryptSync(edata, passphrase);

      ddata.equals(data).should.be.true;
    });

    it("should be able to decrypt encrypted data (async)", function (done) {
      var data = Buffer.from("some encrypted data"),
        passphrase = "somePassphrase";
      crypto.encrypt(data, passphrase, function (err, edata) {
        if (!err) {
          // Encrypted data should differ from original
          edata.should.be.a.Buffer;
          edata.equals(data).should.be.false;

          crypto.decrypt(edata, passphrase, function (err, ddata) {
            ddata.equals(data).should.be.true;
            done(err);
          });
        } else done(err);
      });
    });

    it("should be able to decrypt encrypted data from pass key", function () {
      var passKey = crypto.deriveKeyFromPassSync("passphrase"),
        data = Buffer.from("encrypt me with a pass key struct"),
        edata = crypto.encryptPassKeySync(data, passKey);

      edata.equals(data).should.be.false;

      var ddata = crypto.decryptPassKeySync(edata, passKey);

      ddata.equals(data).should.be.true;
    });

    it("should be able to decrypt encrypted data from pass key (async)", function (done) {
      var data = Buffer.from("encrypt me with a pass key struct async");
      crypto.deriveKeyFromPass("somePass", function (err, passKey) {
        if (!err) {
          crypto.encryptPassKey(data, passKey, function (err, edata) {
            if (!err) {
              edata.equals(data).should.be.false;
              crypto.decryptPassKey(edata, passKey, function (err, ddata) {
                if (!err) {
                  ddata.equals(data).should.be.true;
                  done();
                } else done(err);
              });
            } else done(err);
          });
        } else done(err);
      });
    });

    it("should get the salt from encrypted data", function () {
      var pass = "somePassword",
        data = Buffer.from("some data"),
        edata = crypto.encryptSync(data, pass),
        salt = crypto.getSaltSync(edata);
      salt.should.be.a.Buffer;
      salt.length.should.equal(consts.TOX_PASS_SALT_LENGTH);
    });

    it("should get the salt from encrypted data (async)", function (done) {
      var pass = "somePassphrase",
        data = Buffer.from("encrypt me");
      crypto.encrypt(data, pass, function (err, edata) {
        if (!err) {
          crypto.getSalt(edata, function (err, salt) {
            if (!err) {
              salt.should.be.a.Buffer;
              salt.length.should.equal(consts.TOX_PASS_SALT_LENGTH);
              done();
            } else done(err);
          });
        } else done(err);
      });
    });
  });

  describe("encryption and decryption (file helpers)", function () {
    it("should encrypt and decrypt to/from files", function () {
      var data = Buffer.from("encrypt me to a file"),
        pass = "somePassword",
        temp = mktempToxSync();
      crypto.encryptFileSync(temp, data, pass);
      var ddata = crypto.decryptFileSync(temp, pass);
      ddata.equals(data).should.be.true;
      fs.unlinkSync(temp);
    });

    it("should encrypt and decrypt to/from files (async)", function (done) {
      var data = Buffer.from("encrypt me to a file async"),
        pass = "somePassphrase",
        temp = mktempToxSync();
      crypto.encryptFile(temp, data, pass, function (err) {
        if (!err) {
          crypto.decryptFile(temp, pass, function (err, ddata) {
            if (!err) {
              ddata.equals(data).should.be.true;
              fs.unlinkSync(temp);
              done();
            } else {
              fs.unlinkSync(temp);
              done(err);
            }
          });
        } else {
          fs.unlinkSync(temp);
          done(err);
        }
      });
    });
  });

  describe("key derivation", function () {
    it("should derive a key with a random salt", function () {
      var obj = toxPassKeyToObject(crypto.deriveKeyFromPassSync("somePassword"));
      obj.key.should.be.a.Buffer;
      obj.key.length.should.equal(consts.TOX_PASS_KEY_LENGTH);
      obj.salt.should.be.a.Buffer;
      obj.salt.length.should.equal(consts.TOX_PASS_SALT_LENGTH);
    });

    it("should derive a key with a random salt (async)", function (done) {
      crypto.deriveKeyFromPass("somePassphrase", function (err, obj) {
        if (!err) {
          obj = toxPassKeyToObject(obj);
          obj.key.should.be.a.Buffer;
          obj.key.length.should.equal(consts.TOX_PASS_KEY_LENGTH);
          obj.salt.should.be.a.Buffer;
          obj.salt.length.should.equal(consts.TOX_PASS_SALT_LENGTH);
          done();
        } else done(err);
      });
    });

    it("should derive a key with a given salt", function () {
      var pass = "somePassphrase",
        obj = toxPassKeyToObject(crypto.deriveKeyFromPassSync(pass)),
        otherObj = toxPassKeyToObject(crypto.deriveKeyWithSaltSync(pass, obj.salt));
      obj.salt.equals(otherObj.salt).should.be.true;
      obj.key.equals(otherObj.key).should.be.true;
    });

    it("should derive a key with a given salt (async)", function (done) {
      var pass = "asyncPassword";
      crypto.deriveKeyFromPass(pass, function (err, obj) {
        if (!err) {
          obj = toxPassKeyToObject(obj);
          crypto.deriveKeyWithSalt(pass, obj.salt, function (err, otherObj) {
            if (!err) {
              otherObj = toxPassKeyToObject(otherObj);
              obj.salt.equals(otherObj.salt).should.be.true;
              obj.key.equals(otherObj.key).should.be.true;
              done();
            } else done(err);
          });
        } else done(err);
      });
    });
  });
});

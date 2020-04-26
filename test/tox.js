/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright © 2016-2020 The TokTok team.
 * Copyright © 2014-2016 saneki <s@neki.me>
 */

var assert = require("assert");
var async = require("async");
var fs = require("fs");
var mktemp = require("mktemp");
var should = require("should");
var path = require("path");

function loadModule(mod) {
  try {
    return require(path.join("js-toxcore-c", "js-toxcore-c", "js-toxcore-c", "lib", mod));
  } catch (e) {
    return require(path.join(__dirname, "..", "lib", mod));
  }
}

var Tox = loadModule("tox");
var ToxEncryptSave = loadModule("toxencryptsave");
var consts = loadModule("consts");

require("buffer");

// Helper mktemp functions
var mktempToxSync = mktemp.createFileSync.bind(undefined, "XXXXX.tox");

// @todo: Cleanup (kill tox instances afterwards)
describe("Tox", function () {
  var tox = new Tox();
  tox.start();

  var toxNoUdp = new Tox({ udp: false });
  toxNoUdp.start();

  var customPort = 33510;
  var toxCustomPort = new Tox({ startPort: customPort, endPort: customPort });
  toxCustomPort.start();

  var toxDead = new Tox();
  toxDead.free();

  var addressRegex = /^[0-9a-fA-F]{76}$/;

  var fakeAddresses = [
    "7bd26c7867ef3a08f0010dc646845284a52f69cb9fded8a2635da3bfe0ba7a4f8facd97f24d6",
    "18e8bba90991e22dc70d8e8c188c93c4d38d62d2ab4c6d5aa6758b9b34925a31b18e0e25019b",
  ];

  var fakePublicKeys = [
    "94f44a6edbfc8ff1dc3ed3c460da046f4280a234edcbd7f11c023e43f4f0cd67",
    "5a1cd1a18f4411de8267154b6d9ac3a93d98e8c6e682987803cc6057472c444c",
    "fd31376ac876b7a5199239e859ec001a518dc79e9fb5c486b5dde3f3fd97c052",
    "32ab7ac2c01b0413804f2de691abafd1420f4bb41a1cdcaafbb4650b3b13a41a",
  ];

  describe("#getAddress(), #getAddressSync()", function () {
    it("should return a buffer of expected size", function () {
      var addr = tox.getAddressSync();
      addr.should.be.a.Buffer;
      addr.length.should.equal(consts.TOX_FRIEND_ADDRESS_SIZE);
    });

    it("should return a buffer of expected size (async)", function (done) {
      tox.getAddress(function (err, addr) {
        addr.should.be.a.Buffer;
        addr.length.should.equal(consts.TOX_FRIEND_ADDRESS_SIZE);
        done(err);
      });
    });
  });

  describe("#getAddressHex(), #getAddressHexSync()", function () {
    it("should return an address as a hex string", function () {
      var addr = tox.getAddressHexSync();
      addr.should.match(addressRegex);
    });

    it("should return an address as a hex string (async)", function (done) {
      tox.getAddressHex(function (err, addr) {
        addr.should.match(addressRegex);
        done(err);
      });
    });
  });

  describe("friend getter functions", function () {
    describe("before setting", function () {
      describe("#getFriendByPublicKey(), #getFriendByPublicKeySync()", function () {
        it("should throw an exception", function () {
          (function () {
            tox.getFriendByPublicKeySync(fakePublicKeys[0]);
          }.should.throw());
        });

        it("should return an exception (async)", function (done) {
          tox.getFriendByPublicKey(fakePublicKeys[0], function (err) {
            should.exist(err);
            done();
          });
        });
      });

      describe("#getFriendPublicKey(), #getFriendPublicKeySync()", function () {
        it("should throw an exception", function () {
          (function () {
            tox.getFriendPublicKeySync(0);
          }.should.throw());
        });

        it("should return an exception (async)", function (done) {
          tox.getFriendPublicKey(0, function (err) {
            should.exist(err);
            done();
          });
        });
      });

      describe("#deleteFriend(), #deleteFriendSync()", function () {
        it('should throw an exception if friend doesn"t exist', function () {
          (function () {
            tox.deleteFriendSync(0);
          }.should.throw());
        });

        it('should return an exception if friend doesn"t exist', function (done) {
          tox.deleteFriend(0, function (err) {
            should.exist(err);
            done();
          });
        });
      });

      describe("#hasFriend(), #hasFriendSync()", function () {
        it('should return false if friend doesn"t exist', function () {
          tox.hasFriendSync(0).should.be.false;
        });

        it('should return false if friend doesn"t exist (async)', function (done) {
          tox.hasFriend(0, function (err, exists) {
            exists.should.be.false;
            done(err);
          });
        });
      });
    });

    describe("#getFriendPublicKey(), #getFriendPublicKeySync()", function () {
      it("should return a number if a friend has the public key", function () {
        var publicKey = fakePublicKeys[2];
        (function () {
          tox.getFriendByPublicKeySync(publicKey);
        }.should.throw());
        // Add and try again
        var added = tox.addFriendNoRequestSync(publicKey);
        var retrieved = tox.getFriendByPublicKeySync(publicKey);
        added.should.equal(retrieved);

        var retrievedKey = tox.getFriendPublicKeySync(added);
        retrievedKey.toString("hex").toLowerCase().should.equal(publicKey.toLowerCase());

        tox.hasFriendSync(added).should.be.true;
      });

      it("last online for never-seen friend should be a NaN Date", function () {
        var lastOnline = tox.getFriendLastOnlineSync(0);
        lastOnline.getTime().should.be.NaN;
      });

      it("should return a number if a friend has the public key (async)", function (done) {
        var publicKey = fakePublicKeys[3];
        tox.getFriendByPublicKey(publicKey, function (err) {
          should.exist(err);
          tox.addFriendNoRequest(publicKey, function (err, added) {
            if (err) {
              done(err);
              return;
            }
            tox.getFriendByPublicKey(publicKey, function (err, retrieved) {
              if (err) {
                done(err);
                return;
              }
              added.should.equal(retrieved);
              tox.getFriendPublicKey(added, function (err, retrievedKey) {
                if (err) {
                  done(err);
                  return;
                }
                retrievedKey.toString("hex").toLowerCase().should.equal(publicKey.toLowerCase());
                tox.hasFriend(added, function (err, exists) {
                  exists.should.be.true;
                  done(err);
                });
              });
            });
          });
        });
      });
    });

    describe("#getFriendPublicKeyHex(), #getFriendPublicKeyHexSync()", function () {
      it("should get the public key as hex", function () {
        var key = tox.getFriendPublicKeyHexSync(0);
        key.toLowerCase().should.equal(fakePublicKeys[2].toLowerCase());
      });

      it("should get the public key as hex (async)", function (done) {
        tox.getFriendPublicKeyHex(1, function (err, key) {
          key.toLowerCase().should.equal(fakePublicKeys[3].toLowerCase());
          done(err);
        });
      });
    });

    describe("#getFriendList(), #getFriendListSync()", function () {
      it("should get all friends", function () {
        var list = tox.getFriendListSync();
        list.length.should.equal(2);
      });

      it("should get all friends (async)", function (done) {
        tox.getFriendList(function (err, list) {
          list.length.should.equal(2);
          done(err);
        });
      });
    });

    describe("#deleteFriend(), #deleteFriendSync()", function () {
      it("should remove an existing friend", function () {
        tox.deleteFriendSync(0);
      });

      it("should remove an existing friend (async)", function (done) {
        tox.deleteFriend(1, done);
      });
    });
  });

  describe("#setName(), #setNameSync(), #getName(), #getNameSync()", function () {
    it("should set and get the name", function () {
      var name = "Hello world!";
      tox.setNameSync(name);
      tox.getNameSync().should.equal(name);
    });

    it("should set and get the name (async)", function (done) {
      var name = "Some name";
      tox.setName(name, function (err) {
        if (err) done(err);
        tox.getName(function (err, newName) {
          newName.should.equal(name);
          done(err);
        });
      });
    });
  });

  describe("#setStatusMessage(), #setStatusMessageSync(), #getStatusMessage(), #getStatusMessageSync()", function () {
    it("should set and get the status message", function () {
      var statusMessage = "Hello world!";
      tox.setStatusMessageSync(statusMessage);
      tox.getStatusMessageSync().should.equal(statusMessage);
    });

    it("should set and get the status message (async)", function (done) {
      var statusMessage = "Some status message";
      tox.setStatusMessage(statusMessage, function (err) {
        if (err) done(err);
        tox.getStatusMessage(function (err, newStatusMessage) {
          newStatusMessage.should.equal(statusMessage);
          done(err);
        });
      });
    });
  });

  describe("#setStatus(), #setStatusSync(), #getStatus(), #getStatusSync()", function () {
    it("should set and get the status", function () {
      var status = 1;
      tox.setStatusSync(status);
      tox.getStatusSync().should.equal(status);
    });

    it("should set and get the status (async)", function (done) {
      var status = 2;
      tox.setStatus(status, function (err) {
        if (err) done(err);
        tox.getStatus(function (err, newStatus) {
          newStatus.should.equal(status);
          done(err);
        });
      });
    });
  });

  describe("#addFriend(), #addFriendSync(), #addFriendNoRequest(), #addFriendNoRequestSync()", function () {
    it("should add a friend from a hex string address", function () {
      var addr = fakeAddresses[0],
        friend = tox.addFriendSync(addr, "Hi!");
      should(friend).be.type("number");
    });

    it("should add a friend from a hex string address (async)", function (done) {
      var addr = fakeAddresses[1];
      tox.addFriend(addr, "Hello", function (err, friend) {
        should(friend).be.type("number");
        done(err);
      });
    });

    it("should add a friend from a hex string public key", function () {
      var publicKey = fakePublicKeys[0],
        friend = tox.addFriendNoRequestSync(publicKey);
      should(friend).be.type("number");
    });

    it("should add a friend from a hex string public key (async)", function (done) {
      var publicKey = fakePublicKeys[1];
      tox.addFriendNoRequest(publicKey, function (err, friend) {
        should(friend).be.type("number");
        done(err);
      });
    });
  });

  describe("#getUdpPort(), #getUdpPortSync()", function () {
    it("should return a Number with udp enabled by default", function () {
      var port = tox.getUdpPortSync();
      port.should.be.a.Number;
      port.should.be.greaterThan(0);
    });

    it("should return a Number with udp enabled by default (async)", function (done) {
      tox.getUdpPort(function (err, port) {
        port.should.be.a.Number;
        port.should.be.greaterThan(0);
        done(err);
      });
    });

    it("should return the port specified", function () {
      var port = toxCustomPort.getUdpPortSync();
      port.should.equal(customPort);
    });

    it("should return the port specified (async)", function (done) {
      toxCustomPort.getUdpPort(function (err, port) {
        port.should.equal(customPort);
        done(err);
      });
    });

    it("should throw a not-bound error if not listening on udp", function () {
      (function () {
        toxNoUdp.getUdpPortSync();
      }.should.throw());
    });

    it("should return a not-bound error if not listening on udp (async)", function (done) {
      toxNoUdp.getUdpPort(function (err, port) {
        should.exist(err);
        done();
      });
    });

    it("should throw an error if no handle", function () {
      (function () {
        toxDead.getUdpPortSync();
      }.should.throw());
    });

    it("should return an error if no handle (async)", function (done) {
      toxDead.getUdpPort(function (err, port) {
        should.exist(err);
        done();
      });
    });
  });

  describe("#getTcpPort(), #getTcpPortSync()", function () {
    it("should throw a not-bound error if not a tcp relay", function () {
      (function () {
        tox.getTcpPortSync();
      }.should.throw());
    });

    it("should return a not-bound error if not a tcp relay (async)", function (done) {
      tox.getTcpPort(function (err, port) {
        should.exist(err);
        done();
      });
    });
  });

  describe("#isUdp()", function () {
    it("should return true with udp enabled by default", function () {
      tox.isUdp().should.be.true;
    });

    it("should return false if not listening on an udp port", function () {
      toxNoUdp.isUdp().should.be.false;
    });
  });

  describe("#isTcp()", function () {
    it("should return false if not a tcp relay", function () {
      tox.isTcp().should.be.false;
    });
  });

  describe("#getSavedataSize(), #getSavedataSizeSync(), #getSavedata(), #getSavedataSync()", function () {
    it("should save data to a Buffer of the specified size", function () {
      var size = tox.getSavedataSizeSync();
      var data = tox.getSavedataSync();
      data.length.should.equal(size);
    });

    it("should save data to a Buffer of the specified size (async)", function (done) {
      tox.getSavedataSize(function (err, size) {
        if (err) {
          done(err);
          return;
        }

        tox.getSavedata(function (err, data) {
          data.length.should.equal(size);
          done(err);
        });
      });
    });

    it("should load the savedata correctly", function () {
      var toxToSave = new Tox(),
        address = toxToSave.getAddressHexSync(),
        data = toxToSave.getSavedataSync();
      new Tox({ data: data }).getAddressHexSync().toUpperCase().should.equal(address.toUpperCase());
    });
  });

  describe("#getOptions()", function () {
    it("should handle proxies", function () {
      var prox1 = new Tox({
          proxy: { type: "http", address: "12.34.56.92", port: 9411 },
        }),
        opts1 = prox1.getOptions();
      opts1.proxy_type.should.equal(consts.TOX_PROXY_TYPE_HTTP);
      opts1.proxy_address.should.equal("12.34.56.92");
      opts1.proxy_port.should.equal(9411);
      prox1.free();
    });
  });

  describe("crypto support", function () {
    it("should be provided by default", function () {
      tox.hasCrypto().should.be.true;
    });

    it('should not break when the "crypto" option is passed to Tox constructor', function () {
      var toxWithCrypto1 = new Tox({ crypto: true }),
        toxWithCrypto2 = new Tox({ crypto: new ToxEncryptSave() }),
        toxWithoutCrypto1 = new Tox({ crypto: false });
      toxWithCrypto1.hasCrypto().should.be.true;
      toxWithCrypto2.hasCrypto().should.be.true;
      toxWithoutCrypto1.hasCrypto().should.be.false;
    });

    it("should automatically try to decrypt provided encrypted data, given a pass", function () {
      this.timeout(5000);
      var toxToSave = new Tox(),
        address = toxToSave.getAddressHexSync(),
        data = toxToSave.getSavedataSync(),
        passphrase = "helloWorld",
        edata = toxToSave.crypto().encryptSync(data, passphrase),
        toxEncrypted = [
          new Tox({ data: edata, pass: passphrase }),
          new Tox({
            data: edata,
            pass: function () {
              return passphrase;
            },
          }),
        ];
      toxEncrypted.forEach(function (tox) {
        tox.getAddressHexSync().toUpperCase().should.equal(address.toUpperCase());
      });
    });

    it("should throw if wrong passphrase is given", function () {
      var toxToSave = new Tox(),
        data = toxToSave.getSavedataSync(),
        edata = toxToSave.crypto().encryptSync(data, "myPassphrase");
      // Should throw TOX_ERR_DECRYPTION_FAILED
      (function () {
        new Tox({ data: edata, pass: "notThePass" });
      }.should.throw());
    });

    it("should not try to decrypt if no passphrase is given", function () {
      var toxToSave = new Tox(),
        data = toxToSave.getSavedataSync(),
        edata = toxToSave.crypto().encryptSync(data, "myPassphrase");
      // Should throw TOX_ERR_NEW_LOAD_ENCRYPTED
      (function () {
        new Tox({ data: edata });
      }.should.throw());
    });
  });

  describe("version functions", function () {
    it("should return numbers", function () {
      var version = [tox.versionMajorSync(), tox.versionMinorSync(), tox.versionPatchSync()];
      version.forEach(function (num) {
        num.should.be.a.Number;
      });
    });

    it("should return numbers (async)", function (done) {
      async.parallel(
        [tox.versionMajor.bind(tox), tox.versionMinor.bind(tox), tox.versionPatch.bind(tox)],
        function (err, results) {
          results.forEach(function (num) {
            num.should.be.a.Number;
          });
          done(err);
        }
      );
    });
  });

  // @todo: Address check
  describe("nospam", function () {
    it("should be a number", function () {
      tox.getNospamSync().should.be.a.Number;
    });

    it("should be a number (async)", function (done) {
      tox.getNospam(function (err, nospam) {
        nospam.should.be.a.Number;
        done(err);
      });
    });

    it("should set a number", function () {
      var nospam = 0x1234;
      tox.setNospamSync(nospam);
      tox.getNospamSync().should.equal(nospam);
    });

    it("should set a number (async)", function (done) {
      var nospam = 0x9876;
      async.series(
        [Tox.prototype.setNospam.bind(tox, nospam), Tox.prototype.getNospam.bind(tox)],
        function (err, results) {
          results[1].should.equal(nospam);
          done(err);
        }
      );
    });
  });

  describe("ToxOptions", function () {
    it("should allocate and free", function () {
      var opts = tox.newOptionsSync();
      tox.freeOptionsSync(opts);
    });

    it("should allocate and free (async)", function (done) {
      tox.newOptions(function (err, opts) {
        if (!err) {
          tox.freeOptions(opts, function (err) {
            done(err);
          });
        } else done(err);
      });
    });
  });

  describe("self key functions", function () {
    it("should get the public key", function () {
      var key = tox.getPublicKeySync();
      key.length.should.equal(consts.TOX_PUBLIC_KEY_SIZE);
    });

    it("should get the public key (async)", function (done) {
      tox.getPublicKey(function (err, key) {
        key.length.should.equal(consts.TOX_PUBLIC_KEY_SIZE);
        done(err);
      });
    });

    it("should get the public key as hex", function () {
      var keyHex = tox.getPublicKeyHexSync();
      keyHex.length.should.equal(consts.TOX_PUBLIC_KEY_SIZE * 2);
    });

    it("should get the public key as hex (async)", function (done) {
      tox.getPublicKeyHex(function (err, keyHex) {
        keyHex.length.should.equal(consts.TOX_PUBLIC_KEY_SIZE * 2);
        done(err);
      });
    });

    it("should get the secret key", function () {
      var key = tox.getSecretKeySync();
      key.length.should.equal(consts.TOX_SECRET_KEY_SIZE);
    });

    it("should get the secret key (async)", function (done) {
      tox.getSecretKey(function (err, key) {
        key.length.should.equal(consts.TOX_SECRET_KEY_SIZE);
        done(err);
      });
    });

    it("should get the secret key as hex", function () {
      var keyHex = tox.getSecretKeyHexSync();
      keyHex.length.should.equal(consts.TOX_SECRET_KEY_SIZE * 2);
    });

    it("should get the secret key as hex (async)", function (done) {
      tox.getSecretKeyHex(function (err, keyHex) {
        keyHex.length.should.equal(consts.TOX_SECRET_KEY_SIZE * 2);
        done(err);
      });
    });
  });

  describe("saving and loading", function () {
    var toxToSave = new Tox(),
      address = toxToSave.getAddressHexSync().toUpperCase();

    it("should save and be loaded", function () {
      var data = toxToSave.getSavedataSync(),
        toxToLoad = new Tox({ data: data });
      toxToLoad.getAddressHexSync().toUpperCase().should.equal(address);
      toxToLoad.free();
    });

    it("should save and be loaded (async)", function (done) {
      toxToSave.getSavedata(function (err, data) {
        var toxToLoad = new Tox({ data: data });
        toxToLoad.getAddressHexSync().toUpperCase().should.equal(address);
        toxToLoad.free();
        done(err);
      });
    });

    it("should save and be loaded from file", function () {
      var temp = mktempToxSync();
      toxToSave.saveToFileSync(temp);
      var toxToLoad = new Tox({ data: temp });
      toxToLoad.getAddressHexSync().toUpperCase().should.equal(address);
      toxToLoad.free();
      fs.unlinkSync(temp); // Remove file
    });

    it("should save and be loaded from file (async)", function (done) {
      var temp = mktempToxSync();
      toxToSave.saveToFile(temp, function (err) {
        if (!err) {
          Tox.load({ data: temp }, function (err, toxToLoad) {
            if (!err) {
              toxToLoad.getAddressHexSync().toUpperCase().should.equal(address);
              toxToLoad.free();
            }
            fs.unlinkSync(temp);
            done(err);
          });
        } else done(err);
      });
    });

    after(function () {
      toxToSave.free();
    });
  });

  describe("hashing", function () {
    it("should hash some data", function () {
      var hash = tox.hashSync(Buffer.from([0, 1, 2, 3]));
      hash.length.should.equal(consts.TOX_HASH_LENGTH);
    });

    it("should hash some data (async)", function (done) {
      tox.hash(Buffer.from([0, 1, 2, 3]), function (err, hash) {
        if (!err) {
          hash.length.should.equal(consts.TOX_HASH_LENGTH);
          done();
        } else done(err);
      });
    });

    it("should hash some string", function () {
      var hash = tox.hashSync("aaa");
      hash.length.should.equal(consts.TOX_HASH_LENGTH);
    });

    it("should hash some string (async)", function (done) {
      tox.hash("aaa", function (err, hash) {
        if (!err) {
          hash.length.should.equal(consts.TOX_HASH_LENGTH);
          done();
        } else done(err);
      });
    });
  });

  describe("file control name to value", function () {
    it("should convert from control name to control value correctly", function () {
      var RESUME = consts.TOX_FILE_CONTROL_RESUME,
        PAUSE = consts.TOX_FILE_CONTROL_PAUSE,
        CANCEL = consts.TOX_FILE_CONTROL_CANCEL;

      tox._fixFileControl("resume").should.equal(RESUME);
      tox._fixFileControl("Resume").should.equal(RESUME);
      tox._fixFileControl("RESUME").should.equal(RESUME);
      tox._fixFileControl(RESUME).should.equal(RESUME);
      tox._fixFileControl("pause").should.equal(PAUSE);
      tox._fixFileControl("Pause").should.equal(PAUSE);
      tox._fixFileControl("PAUSE").should.equal(PAUSE);
      tox._fixFileControl(PAUSE).should.equal(PAUSE);
      tox._fixFileControl("cancel").should.equal(CANCEL);
      tox._fixFileControl("Cancel").should.equal(CANCEL);
      tox._fixFileControl("CANCEL").should.equal(CANCEL);
      tox._fixFileControl(CANCEL).should.equal(CANCEL);
    });
  });

  describe("event emitter", function () {
    it("should be gettable from a Tox instance", function () {
      should.exist(tox.getEmitter());
    });
  });
});

#!/usr/bin/env node
/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright © 2016-2020 The TokTok team.
 * Copyright © 2014-2016 saneki <s@neki.me>
 */

/**
 * A tiny tox file transfer example using node-toxcore's file transfer methods.
 */

var fs = require("fs-ext");
var path = require("path");
var mkdirp = require("mkdirp");
var toxcore = require("js-toxcore-c");
var util = require("util");
var tox = new toxcore.Tox();
var consts = toxcore.Consts;

// Map of files: file_number => file_descriptor
var files = {};

var uploadPath = path.normalize(path.join(__dirname, "..", "tmp"));

var sendPath = "file.txt"; // Test file to send
var sendSize = 0;
var sendFile = undefined; // Opened file

try {
  sendFile = fs.openSync(sendPath, "r");
  var stat = fs.statSync(sendPath);
  sendSize = stat.size;
  console.log("Initialized file to send (path=%s, size=%d)", sendPath, sendSize);
} catch (e) {
  console.error(e);
}

var CANCEL = consts.TOX_FILE_CONTROL_CANCEL,
  PAUSE = consts.TOX_FILE_CONTROL_PAUSE,
  RESUME = consts.TOX_FILE_CONTROL_RESUME;

var DATA = consts.TOX_FILE_KIND_DATA,
  AVATAR = consts.TOX_FILE_KIND_AVATAR;

var SEEK_SET = 0,
  SEEK_CUR = 1,
  SEEK_END = 2;

/**
 * Fix a filename by replacing all path separators with _.
 * @param {String} filename - Filename to fix
 * @return {String} Fixed filename
 */
var fixRecvFilename = function (filename) {
  ["/", "\\"].forEach(function (r) {
    filename = filename.replace(r, "_");
  });
  return filename;
};

/**
 * Bootstrap tox via hardcoded nodes.
 * For more nodes, see: https://wiki.tox.chat/users/nodes
 */
var nodes = [
  {
    maintainer: "Anthony Bilinski",
    address: "tox.abilinski.com",
    port: 33445,
    key: "10C00EB250C3233E343E2AEBA07115A5C28920E9C8D29492F6D00B29049EDC7E",
  },
];

// Bootstrap from nodes
nodes.forEach(function (node) {
  tox.bootstrapSync(node.address, node.port, node.key);
  console.log(
    "Successfully bootstrapped from " + node.maintainer + " at " + node.address + ":" + node.port
  );
  console.log("... with key " + node.key);
});

tox.on("selfConnectionStatus", function (e) {
  console.log(e.isConnected() ? "Connected" : "Disconnected");
});

// Auto-accept friend requests
tox.on("friendRequest", function (e) {
  tox.addFriendNoRequestSync(e.publicKey());
});

tox.on("friendMessage", function (e) {
  console.log("Received message (friend=%d, message=%s)", e.friend(), e.message());
  if (/^send$/i.test(e.message())) {
    if (sendFile !== undefined) {
      console.log("Beginning send (friend=%d)", e.friend());
      tox.sendFileSync(e.friend(), DATA, sendPath, sendSize);
    }
  }
});

tox.on("fileRecvControl", function (e) {
  console.log("Received file control from %d: %s", e.friend(), e.controlName());

  // If cancel, release resources (close file)
  if (e.isCancel()) {
    var fd = files[e.file()];
    if (descriptor !== undefined) {
      fs.closeSync(fd);
      files[e.file()] = undefined;
    }
  }
});

tox.on("fileChunkRequest", function (e) {
  if (sendFile) {
    var data = Buffer.alloc(e.length()),
      bytesRead = 0;

    try {
      bytesRead = fs.readSync(sendFile, data, 0, data.length, e.position());
    } catch (err) {
      // Expected: Out of bounds error
      console.log("Position out-of-bounds, sending nothing (friend=%d)", e.friend());
      //tox.sendFileChunkSync(e.friend(), e.file(), e.position(), new Buffer(0));
      //console.log('DONE (1)');
      return;
    }

    if (data.length !== bytesRead) {
      data = data.slice(0, bytesRead);
    }

    console.log(
      "Sending chunk (friend=%d, position=%d, size=%d)",
      e.friend(),
      e.position(),
      data.length
    );
    tox.sendFileChunkSync(e.friend(), e.file(), e.position(), data);
    //console.log('DONE (2)');
  }
});

tox.on("fileRecv", function (e) {
  if (e.kind() === DATA) {
    var filename = fixRecvFilename(e.filename());
    if (filename.length > 0) {
      // Resulting path should look like:
      // {uploadPath}/friend_0/{filename}
      var friendDirName = "friend_" + e.friend(),
        filepath = path.join(uploadPath, friendDirName, filename);

      // Make the parent directory
      try {
        mkdirp.sync(path.dirname(filepath), { mode: 0775 });
      } catch (e) {}

      // Open and store in file map
      var fd = fs.openSync(filepath, "w");
      files[e.file()] = fd;

      // Tell sender we're ready to start the transfer
      tox.controlFileSync(e.friend(), e.file(), "resume");
    } else {
      console.log("Fixed filename is empty string (original: %s)", e.filename());
      tox.controlFileSync(e.friend(), e.file(), "cancel");
    }
  } else {
    // If not a data file (avatar), cancel
    console.log("File is avatar, ignoring");
    tox.controlFileSync(e.friend(), e.file(), "cancel");
  }
});

tox.on("fileRecvChunk", function (e) {
  var fd = files[e.file()];

  if (e.isNull()) {
    console.log("NULL pointer for e.data(), ignoring received chunk");
    return;
  }

  // If length is 0, transfer is finished, release resources
  if (e.isFinal()) {
    fs.closeSync(fd);
    files[e.file()] = undefined;
  } else {
    fs.seekSync(fd, e.position(), SEEK_SET);
    fs.writeSync(fd, e.data(), 0, e.length());
  }
});

tox.setNameSync("File Transfer Bot");
tox.setStatusMessageSync("node-toxcore file transfer bot example");

console.log("Address: " + tox.getAddressHexSync());

// Start the tox_iterate loop
tox.start();

#!/usr/bin/env node
/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright © 2016-2020 The TokTok team.
 * Copyright © 2014-2016 saneki <s@neki.me>
 */

/**
 * A tiny tox bot example using node-toxcore's synchronous methods (new_api).
 */
var testingMode = false;

var path = require("path");
var toxcore = !testingMode
  ? require("js-toxcore-c")
  : require(path.join(__dirname, "..", "..", "lib", "main"));
var tox = new toxcore.Tox();

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

tox.on("friendName", function (e) {
  var name = tox.getFriendNameSync(e.friend());
  console.log(name + "[" + e.friend() + "] changed their name: " + e.name());
});

tox.on("friendStatusMessage", function (e) {
  var name = tox.getFriendNameSync(e.friend());
  console.log(name + "[" + e.friend() + "] changed their status message: " + e.statusMessage());
});

tox.on("friendStatus", function (e) {
  var name = tox.getFriendNameSync(e.friend());
  console.log(name + "[" + e.friend() + "] changed their status: " + e.status());
});

tox.on("friendConnectionStatus", function (e) {
  var name = tox.getFriendNameSync(e.friend());
  var statusMessage = tox.getFriendStatusMessageSync(e.friend());
  console.log(
    name +
      "[" +
      e.friend() +
      "] is now " +
      (e.isConnected() ? "online" : "offline") +
      ": " +
      statusMessage
  );
});

tox.on("friendTyping", function (e) {
  var name = tox.getFriendNameSync(e.friend());
  console.log(name + "[" + e.friend() + "] is " + (e.isTyping() ? "typing" : "not typing"));
});

tox.on("friendReadReceipt", function (e) {
  var name = tox.getFriendNameSync(e.friend());
  console.log(name + "[" + e.friend() + "] receipt: " + e.receipt());
});

tox.on("friendRequest", function (e) {
  tox.addFriendNoRequestSync(e.publicKey());
  console.log("Received friend request: " + e.message());
  console.log("Accepted friend request from " + e.publicKeyHex());
});

tox.on("friendMessage", function (e) {
  var name = tox.getFriendNameSync(e.friend());
  if (e.isAction()) {
    console.log("** " + name + "[" + e.friend() + "] " + e.message() + " **");
  } else {
    console.log(name + "[" + e.friend() + "]: " + e.message());
  }
  // Echo the message back
  tox.sendFriendMessageSync(e.friend(), e.message(), e.messageType());

  if (e.message() === "typing on") {
    tox.setTypingSync(e.friend(), true);
    console.log("Started typing to " + name + "[" + e.friend() + "]");
  } else if (e.message() === "typing off") {
    tox.setTypingSync(e.friend(), false);
    console.log("Stopped typing to " + name + "[" + e.friend() + "]");
  }

  if (e.message() === "profile") {
    var statusMessage = tox.getFriendStatusMessageSync(e.friend()),
      status = tox.getFriendStatusSync(e.friend()),
      connectionStatus = tox.getFriendConnectionStatusSync(e.friend());
    console.log("Friend " + e.friend() + " profile:");
    console.log("  Name: " + name);
    console.log("  Status message: " + statusMessage);
    console.log("  Status: " + status);
    console.log("  Connection status: " + connectionStatus);
  }

  if (e.message() === "lastonline") {
    var lastOnline = tox.getFriendLastOnlineSync(e.friend());
    console.log(name + " last online: " + lastOnline.toString());
  }

  if (e.message() === "namelen") {
    console.log("Name length: " + tox.getFriendNameSizeSync(e.friend()));
    console.log("Status message length: " + tox.getFriendStatusMessageSizeSync(e.friend()));
  }
});

tox.on("friendLosslessPacket", function (e) {
  var name = tox.getFriendNameSync(e.friend());
  console.log("**Received lossless packet from " + "[" + e.friend() + "] (" + name + ")");
  console.log(e.data().toString());
  tox.sendLosslessPacketSync(e.friend(), Buffer.from("lossless-receipt-packet-content"));
});

tox.setNameSync("Sync Bot");
tox.setStatusMessageSync("node-toxcore sync bot example");

console.log("Address: " + tox.getAddressHexSync());

// Start the tox_iterate loop
tox.start();

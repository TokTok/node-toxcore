#!/usr/bin/env node
/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright © 2016-2020 The TokTok team.
 * Copyright © 2014-2016 saneki <s@neki.me>
 */

var toxcore = require("js-toxcore-c");
var tx = new toxcore.Tox(),
  rx = new toxcore.Tox();

var LOSSLESS_CHANNEL = 160;
var LOSSY_CHANNEL = 200;

/*
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

//
// Setup rx
//

rx.setNameSync("Packet Bot (recv)");
rx.setStatusMessageSync("Bot for testing lossless/lossy packet tx/rx");

rx.on("friendRequest", function (e) {
  console.log("[rx] Accepting friend request from: %s", e.publicKeyHex().toUpperCase());
  rx.addFriendNoRequestSync(e.publicKey());
});

rx.on("friendConnectionStatus", function (e) {
  console.log("[rx] Friend connection status: %s", e.isConnected() ? "online" : "offline");
});

var packetCallback = function (e) {
  var packetType = e.isLossless() ? "lossless" : "lossy";
  console.log("** Received %s packet from [%d] **", packetType, e.friend());
  console.log("Id: 0x%s", e.id().toString(16));
  console.log("Data: %s", e.data().toString());

  // Respond using the same id
  if (e.isLossless()) {
    rx.sendLosslessPacketSync(e.friend(), e.id(), Buffer.from("lossless-receipt-packet-content"));
  } else {
    rx.sendLossyPacketSync(e.friend(), e.id(), Buffer.from("lossy-receipt-packet-content"));
  }
};

// Event "friendLosslessPacket": Listen for lossless packets
// e -> FriendPacketEvent
//   e.data()       -> {Buffer} Data buffer without leading id byte
//   e.friend()     -> {Number} Friend number
//   e.fullData()   -> {Buffer} Data buffer including the leading id byte
//   e.id()         -> {Number} Leading Id byte
//   e.isLossless() -> {Boolean} Whether or not the packet was lossless
//   e.isLossy()    -> {Boolean} Whether or not the packet was lossy
rx.on("friendLosslessPacket", packetCallback);

// Event: "friendLossyPacket": Listen for lossy packets
// e -> FriendPacketEvent (same event as used in "friendLosslessPacket" event)
rx.on("friendLossyPacket", packetCallback);

//
// Setup tx
//

tx.setNameSync("Packet Bot (send)");
tx.setStatusMessageSync("Bot for testing lossless/lossy packet tx/rx");

tx.on("selfConnectionStatus", function (e) {
  if (e.isConnected()) {
    console.log("[tx] Adding friend: %s", rx.getAddressHexSync().toUpperCase());
    tx.addFriendSync(rx.getAddressSync(), "Hello");
  }
});

tx.on("friendConnectionStatus", function (e) {
  console.log("[tx] Friend connection status: %s", e.isConnected() ? "online" : "offline");
  if (e.isConnected()) {
    console.log("[tx] Sending lossless + lossy packets");
    tx.sendLosslessPacketSync(e.friend(), LOSSLESS_CHANNEL, Buffer.from("hello-world-lossless"));
    tx.sendLossyPacketSync(e.friend(), LOSSY_CHANNEL, Buffer.from("hello-world-lossy"));

    var losslessMessage2 = Buffer.concat([
      Buffer.from([LOSSLESS_CHANNEL + 1]),
      Buffer.from("lossless-2-param"),
    ]);
    tx.sendLosslessPacketSync(e.friend(), losslessMessage2);

    var lossyMessage2 = Buffer.concat([
      Buffer.from([LOSSY_CHANNEL + 1]),
      Buffer.from("lossy-2-param"),
    ]);
    tx.sendLossyPacketSync(e.friend(), lossyMessage2);
  }
});

tx.on("friendLosslessPacket", function (e) {
  console.log("[tx] Received lossless response: %s", e.data().toString());
});

tx.on("friendLossyPacket", function (e) {
  console.log("[tx] Received lossy response: %s", e.data().toString());
});

// Bootstrap and start each
[
  { tox: tx, name: "tx" },
  { tox: rx, name: "rx" },
].forEach(function (obj) {
  var tox = obj.tox,
    toxName = obj.name;

  // Bootstrap from nodes
  nodes.forEach(function (node) {
    tox.bootstrapSync(node.address, node.port, node.key);
    console.log(
      "[%s] Successfully bootstrapped from %s at %s:%d",
      toxName,
      node.maintainer,
      node.address,
      node.port
    );
    console.log("... with key %s", node.key);
  });

  tox.on("selfConnectionStatus", function (e) {
    console.log("[%s] %s", toxName, e.isConnected() ? "Connected" : "Disconnected");
  });

  console.log("[%s] Address: %s", toxName, tox.getAddressHexSync().toUpperCase());

  tox.start();
});

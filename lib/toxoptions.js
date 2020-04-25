/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright © 2016-2020 The TokTok team.
 * Copyright © 2014-2016 saneki <s@neki.me>
 */

var ref = require("ref-napi");
var RefStruct = require("ref-struct-napi");

var CEnum = "int32";

// TODO(iphydf): Make this use accessors instead of giving it knowledge about
// the struct layout.
var ToxOptions = RefStruct({
  ipv6_enabled: "uint8",
  udp_enabled: "uint8",
  local_discovery_enabled: "uint8",
  proxy_type: CEnum,
  proxy_address: ref.refType("char"),
  proxy_port: "uint16",
  start_port: "uint16",
  end_port: "uint16",
  tcp_port: "uint16",
  hole_punching_enabled: "uint8",
  savedata_type: CEnum,
  savedata_data: ref.refType("uint8"),
  savedata_length: "size_t",
});

module.exports = ToxOptions;

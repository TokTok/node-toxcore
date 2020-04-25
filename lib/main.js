/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright © 2016-2020 The TokTok team.
 * Copyright © 2014-2016 saneki <s@neki.me>
 */

var path = require("path");
var tox = require(path.join(__dirname, "tox"));
var toxencryptsave = require(path.join(__dirname, "toxencryptsave"));
var consts = require(path.join(__dirname, "consts"));

module.exports = {
  Tox: tox,
  ToxEncryptSave: toxencryptsave,
  Consts: consts,
};

/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright © 2016-2020 The TokTok team.
 * Copyright © 2014-2016 saneki <s@neki.me>
 */

var assert = require("assert");
var should = require("should");
var path = require("path");

function loadModule(mod) {
  try {
    return require(path.join("js-toxcore-c", "js-toxcore-c", "js-toxcore-c", "lib", mod));
  } catch (e) {
    return require(path.join(__dirname, "..", "lib", mod));
  }
}

var util = loadModule("util");

var size_t = util.size_t;

require("buffer");

describe("util", function () {
  describe("#size_t()", function () {
    it("should return a Buffer", function () {
      var zeroSize = size_t(0);
      should.exist(zeroSize);
    });
  });
});

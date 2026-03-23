"use strict";

const app = require("../server/src/index");

module.exports = (req, res) => {
  req.url = "/api/docs";
  return app(req, res);
};

"use strict";

const app = require("../../../server/src/index");

module.exports = (req, res) => {
  const { id, ...rest } = req.query || {};
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(rest)) {
    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, String(item)));
    } else if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  }

  const taskId = Array.isArray(id) ? id[0] : id;
  const pathname = `/api/v1/tasks/${taskId}`;
  const search = searchParams.toString();

  req.url = search ? `${pathname}?${search}` : pathname;

  return app(req, res);
};

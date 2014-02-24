var express = require('express');

module.exports = Client;

function Client (port) {
  if (!(this instanceof Client)) return new Client(port);
  Client.init.call(this, port);
}

Client.init = function (port) {
  this._app = express();
  this._app.listen(port);
};

Client.prototype.get = function (route, cb) {
  this._app.get(route, cb);
};

Client.prototype.post = function (route, cb) {
  this._app.post(route, cb);
};

Client.prototype.getRoute = function (method, route) {
  // express.app.routes appearance
  // { get:
  //  [ { path: '/poll/:currency',
  //      method: 'get',
  //      callbacks: [ [Function] ],
  //      keys: [Object],
  //      regexp: /^\/poll\/(?:([^\/]+?))\/?$/i } ],
  // post:
  //  [ { path: '/trade',
  //      method: 'post',
  //      callbacks: [ [Function] ],
  //      keys: [],
  //      regexp: /^\/trade\/?$/i } ] }

  for (var r in this._app.routes[method]) {
    if (this._app.routes[method][r].path === route)
      return this._app.routes[method][r].callbacks[0];
  }

  return 0;
};
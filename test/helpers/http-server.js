var express = require('express');

module.exports = Client;

function Client (port) {
  if (!(this instanceof Client)) return new Client(port);
  Client.init.call(this, port);
}

Client.init = function (port) {
  this._app = express();
  this._port = port;
};

Client.prototype.listen = function () {
  this._app.listen(this._port);
  console.log('info: http server listen @ ' + this._port);
};

Client.prototype.get = function (route, cb) {
  console.log('info: create route "' + route + '" method GET');
  this._app.get(route, cb);
};

Client.prototype.post = function (route, cb) {
  console.log('info: create route "' + route + '" method POST');
  this._app.post(route, cb);
};
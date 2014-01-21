'use strict';

var winston = require('winston');
var logger = new (winston.Logger)({transports:[new (winston.transports.Console)()]});
 
var TIMEOUT = 5000;

var MtGoxPurchase = function(mtgoxClient) {
  this.mtGoxClient = mtgoxClient;
  this.satoshis = null;
  this.callback = null;
  this.verifyResponse = null;
  this.t0 = null;
  this.timedOut = false;
  this.RETRY_INTERVAL = 1000;
};

// Public functions

/*

{ amount: [ 'Ensure that there are no more than 16 digits in total.' ],
  price: [ 'Ensure that there are no more than 7 digits in total.' ] }

*/

MtGoxPurchase.prototype.purchase = function purchase(satoshis, callback) {
  // TODO: Modify low-level mtgox library to keep this in integers
  this.satoshis = satoshis;
  this.callback = callback;
  var bitcoins = this.satoshis / Math.pow(10,8);
  
  var self = this;
  this.mtGoxClient.add('bid', bitcoins, null, function(err, json) {
      if (err) { 
        logger.error('error in purchase. Error %j', err);
        self.callback(err); 
      } else {
        self.txId = json.data;
        self.t0 = process.hrtime();
        self._mtGoxVerify();  
      }
  });
};

// Private functions

// Check with MtGox for a completed order
// This function is recursive
MtGoxPurchase.prototype._mtGoxVerify = function _mtGoxVerify() {  
  
  var self = this;
  this.mtGoxClient.result('bid', this.txId, function(err, json) {
    if (err) {
      // Transaction not yet complete, so MtGox gives us a 500
      // Retry until success or timeout

      var elapsedTime = process.hrtime(self.t0);
      var elapsedMilliseconds = elapsedTime[0] * 1000;
      self.timedOut = elapsedMilliseconds > TIMEOUT;

      if (self.timedOut) {
        self._verifyCallback();
      } else {
        setTimeout(self._mtGoxVerify.bind(self), self.RETRY_INTERVAL);
      }
    } else {
      // We've got a completed order
      self.verifyResponse = json.data;
      self._verifyCallback();
    }
  });
};

// This gets called when we have a completed order or a timeout
MtGoxPurchase.prototype._verifyCallback = function _verifyCallback(err) {
  if (err) {
    logger.error('error in mtgox verify. Error: %j', err);
    this.callback(err, null);
  } else if (this.timedOut) {
    this.callback(new Error('MtGox timeout'), null);
  } else {
    this._verifyPurchase();
  }
};

MtGoxPurchase.prototype._verifyPurchase = function _verifyPurchase() {
  var totalBitcoins = this.verifyResponse.total_amount.value_int;
  var totalFiat = this.verifyResponse.total_spent.value_int;

  if (totalBitcoins < this.bitcoins) {
    // TODO: We should either buy back fiat to cover this, 
    // or make sure this hardly ever happens, with a balance check.
    // Balance check is easier.
    this.callback(new Error('Low funds, could only execute partial trade'));
  } else {
    // TODO: normalize fiat to system fiat
    // TODO: does this include the fee?
    this.callback(null, {fiat: totalFiat * 1000, bitcoins: totalBitcoins});
  }
};

module.exports = MtGoxPurchase;

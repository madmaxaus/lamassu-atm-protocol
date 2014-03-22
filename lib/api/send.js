/*
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
/*
 * read ticker value from memory, if ticker counter has expired then refetch
 */

'use strict';

require('date-utils');

var _transferExchange;
var _txlog = require('./txlog');
var _api;
var _config;



/**
 * initialize ticker library
 */
exports.init = function(config, api, transferExchange) {
  _api = api;
  _config = config;

  _transferExchange = transferExchange;
};



exports.setDomain = function(domain) {
  _transferExchange.setDomain(domain);
};



exports.sendBitcoins = function(txId, address, satoshis, cb) {
  // TODO: First look up txId, to see if it's been seen yet. We'll need a new table for this. 
  // Careful to make this an atomic DB operation. E.g., try to insert the txId into the table,
  // if we get a duplicate record error, it already exists. Prefix txId with ATM ID from devices table.
  _transferExchange.sendBitcoins(address, satoshis, _config.settings.transactionFee, function(err, tx) {
    _txlog.send(new Date(), _config.plugins.current.transfer, address, satoshis, err ? 'error' : 'ok', err, function() {
      cb(err, tx);
      _api.balanceTrigger();
    });
  });
};


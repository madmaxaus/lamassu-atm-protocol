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

'use strict';

var assert = require('chai').assert;
var http = require('http');
var config = require('lamassu-config');
var fnTable = {};
var app = { get:function(route, fn) {
                  fnTable[route] = fn;
                }
          };
var cfg;



/**
 * replace the bitstamp node module request function with one that references localhost
 * for testing.
 */
var mockRequest = function(method, path, data, callback, args) {
  var options = {
    host: 'localhost',
    port: 3000,
    path: path,
    method: method,
    headers: {
      'User-Agent': 'Mozilla/4.0 (compatible; Bitstamp node.js client)'
    }
  };

  if(method === 'post') {
    options.headers['Content-Length'] = data.length;
    options.headers['content-type'] = 'application/x-www-form-urlencoded';
  }

  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var json;
    var buffer = '';
    res.on('data', function(data) {
      buffer += data;
    });
    res.on('end', function() {
      try {
        json = JSON.parse(buffer);
      } catch (err) {
        return callback(err);
      }
      callback(null, json);
    });
  });
  req.on('error', function(err) {
    callback(err);
  });
  req.end(data);
};



/**
 * the tests
 */
describe('trade test', function(){

  beforeEach(function(done) {
    config.load(function(err, result) {
      assert.isNull(err);
      cfg = result.config;
      done();
    });
  });



  it('should execute a trade against bitstamp', function(done) {
    this.timeout(1000000);

    cfg.exchanges.plugins.trade = 'bitstamp_trade';
    var api = require('../../lib/atm-api');
    api.init(app, cfg);

    // replace endpoints for trade and transfer
    api._tradeExchange.client._request = mockRequest;
    api.setTransferDomain('localhost');

    // schedule two trades this should result in a single consolidated trade hitting the trading system
    fnTable['/trade']({params: {fiat: 100, satoshis: 10, currency: 'USD'}}, {json: function(result) {
      console.log(result);
    }});

    fnTable['/trade']({params: {fiat: 100, satoshis: 10, currency: 'USD'}}, {json: function(result) {
      console.log(result);
    }});

    setTimeout(function() { done(); }, 1000000);
    // check results and execute done()
  });
});



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

var hock = require('hock');
var createServer = require('../helpers/create-https-server.js');
var assert = require('chai').assert;
var config = require('lamassu-config');
var fnTable = {};
var app = { get: function(route, fn) {
                  fnTable[route] = fn;
                },
            post: function(route, fn) {
                  fnTable[route] = fn;
                }
          };
var cfg;
var mock = hock.createHock();


describe('ticker test', function(){

  beforeEach(function(done) {
    createServer(mock.handler, function(err, server) {
      server.unref();

      config.load(function(err, result) {
        assert.isNull(err);
        cfg = result.config;
        cfg.exchanges.plugins.current.ticker = 'bitpay';
        cfg.exchanges.plugins.current.trade = null;
        cfg.exchanges.plugins.settings.bitpay = {
          host: 'localhost',
          port: server.address().port,
          rejectUnauthorized: false
        };
        done();
      });
    });
  });


  it('should read ticker data from bitpay', function(done) {
    this.timeout(1000000);

    mock
      .get('/api/rates')
      .reply(200, [
        { code: 'EUR', rate: 1337 },
        { code: 'USD', rate: 100 }
      ]);

    var api = require('../../lib/atm-api');
    api.init(app, cfg);

    // let ticker rate fetch finish...
    setTimeout(function() {
      fnTable['/poll/:currency']({params: {currency: 'USD'}}, {json: function(result) {
        assert.isNull(result.err);
        assert.equal(parseFloat(result.rate, 10), 100);
        done();
      }
      });
    }, 2000);
  });
});


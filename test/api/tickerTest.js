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

var cfg;

var blockchainMock = hock.createHock();
var bitpayMock = hock.createHock();

var testTicker = hock.createHock();

var testPort = 4000;
var HttpDevServer = require('../helpers/http-server');
var app = new HttpDevServer(testPort);
var jsonquest = require('jsonquest');



describe('ticker test', function(){

  beforeEach(function(done) {

    app.listen();

    createServer(blockchainMock.handler, function (err, blockchain) {
      assert.isNull(err);

      createServer(bitpayMock.handler, function(err_, bitpay) {
        assert.isNull(err_);

        config.load(function(err__, result) {
          assert.isNull(err__);

          cfg = result.config;

          cfg.exchanges.plugins.current.ticker = 'bitpay';
          cfg.exchanges.plugins.current.trade = null;
          cfg.exchanges.plugins.settings.bitpay = {
            host: 'localhost',
            port: bitpay.address().port,
            rejectUnauthorized: false
          };

          cfg.exchanges.plugins.current.transfer = 'blockchain';
          cfg.exchanges.plugins.settings.blockchain = {
            host: 'localhost',
            port: blockchain.address().port,
            rejectUnauthorized: false,
            password: 'baz',
            fromAddress: 'f00b4z',
            guid: 'foo'
          };

          done();
        });
      });
    });
  });


  it('should read ticker data from bitpay', function(done) {
    this.timeout(1000000);

    bitpayMock
      .get('/api/rates')
      .reply(200, [
        { code: 'EUR', rate: 1337 },
        { code: 'USD', rate: 100 }
      ]);

    blockchainMock
      .get('/merchant/foo/address_balance?address=f00b4z&confirmations=0&password=baz')
      .reply(200, { balance: 100000000, total_received: 100000000 })

      .get('/merchant/foo/address_balance?address=f00b4z&confirmations=1&password=baz')
      .reply(200, { balance: 100000000, total_received: 100000000 });
    // That's 1 BTC.

    var api = require('../../lib/atm-api');
    api.init(app, cfg);

    // let ticker rate fetch finish...
    setTimeout(function () {
      jsonquest({
        host: 'localhost',
        port: testPort,
        path: '/poll/:currency'.replace(':currency', 'USD'),
        method: 'GET',
        protocol: 'http'
      }, function (err, res, body) {
        assert.isNull(err);
        assert.equal(res.statusCode, 200);

        assert.isNull(body.err);
        assert.equal(Number(body.rate), 100);
        assert.equal(body.fiat, 100 / cfg.exchanges.settings.lowBalanceMargin);

        done();
      });      
    }, 2000);
  });
});
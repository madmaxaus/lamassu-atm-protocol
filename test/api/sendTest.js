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

var crypto = require('crypto');
var async = require('async');
var hock = require('hock');
var createServer = require('../helpers/create-https-server.js');
var assert = require('chai').assert;
var config = require('lamassu-config');

var fnTable = {};

var app = {
  get: function (route, fn) {
      fnTable[route] = fn;
    },
  post: function (route, fn) {
      fnTable[route] = fn;
    }
};

var cfg;
var port;

var blockchainMock = hock.createHock();


describe('send test', function () {

  beforeEach(function (done) {

    async.parallel({
      blockchain: async.apply(createServer, blockchainMock.handler),
      config: config.load
    }, function (err, results) {
      assert.isNull(err);

      cfg = results.config.config;
      port = results.blockchain.address().port;

      cfg.exchanges.plugins.current.transfer = 'blockchain';
      cfg.exchanges.plugins.settings.blockchain = {
        host: 'localhost',
        port: results.blockchain.address().port,
        rejectUnauthorized: false,
        password: 'baz',
        fromAddress: 'f00b4z',
        guid: 'foo'
      };

      done();
    });
  });

  it('should send to blockchain', function (done) {
    this.timeout(1000000);
    
    var satoshis = {
      transferBalance: 100000000,
      tradeBalance: null
    };

    // some hash for transaction
    var hash = crypto.createHash(cfg.updater.extractor.hashAlg).digest('hex');

    // transaction
    var trans = {
      txs: {
        res: {
          hash: hash,
          out: {
            output: {
              value: satoshis,
              addr: '3acf1633-db4d-44a9-9013-b13e85405404'
            }
          }
        }
      }
    };

    blockchainMock
      .get('/address/f00b4z?format=json&limit=10&password=baz')
      .reply(200, trans)
      .post('/merchant/foo/payment?to=localhost%3A' + port + '&amount=&from=f00b4z&password=baz')
      .reply(200, {'tx_hash': hash});


    var api = require('../../lib/atm-api');
    api.init(app, cfg);

    var params = {
      body: {
        address: 'localhost:' + port,
        satoshis: satoshis
      }
    };

    setTimeout(function () {
      fnTable['/send'](params, {json: function (result) {
          assert.isNull(result.err);
          assert.equal(hash, result.results);
          done();
        }
      });
    }, 2000);
  });
});
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

var _ = require('underscore');
var assert = require('chai').assert;
var config = require('lamassu-config');
var apis = [];
var fnTable = {};
var app = { get:function(route, fn) {
                  fnTable[route] = fn;
                }
          };
var cfg;
var tickers = ['bitpay', 'bitstamp', 'custom', 'mtgox'];



describe('ticker test', function(){

  beforeEach(function(done) {
    cfg = config.load();
    done();
  });


  it('should read ticker data from each exchange', function(done) {
    this.timeout(1000000);
    _.each(tickers, function(ticker) {
      cfg.exchanges.plugins.ticker = ticker + '_ticker';
      apis[ticker] = require('../../lib/atm-api');
      apis[ticker].init(app, cfg);
      fnTable['/poll/:currency']({params: {currency: 'USD'}}, {json: function(result) {
        console.log(result);
        assert.isNull(result.err);
        assert(parseFloat(result.rate, 10));
        if (ticker === 'mtgox') {
          done();
        }
      }
      });
    });
  });
});





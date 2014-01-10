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

var ticker = require('./api/ticker');
var _config;



/**
 * read ticker
 * read ticker value from memory, if ticker counter has expired then refetch
 */
var poll = function(req, res) {
  ticker.pollRate(req.params.currency, function(err, rate) {
    res.json({currency: req.params.currency, rate: rate, err: err});
  });
};



/**
 * purchase
 */
var purchase = function(trade) {
};



/**
 * trade
 */
var trade = function(rec) {
};



/**
 * send Bitcoins
 */
var send = function(address, satoshis, cb) {
};



/**
 * initialize the api routes and attach to the express application object
 */
exports.init = function(app, config) {
  _config = config;

  ticker.init(_config.exchanges);

  app.get('/poll/:currency', poll);
  app.get('/purchase', purchase);
  app.get('/trade', trade);
  app.get('/send', send);
//  app.get('/fiatBalance', fiatBalance);
//  app.get('/trigger', trigger);
  return app;
};



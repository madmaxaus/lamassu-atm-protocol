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

var api = exports.api = require('./api/api');
var testMode = require('./testMode');
var _config;



/**
 * read ticker
 * read ticker value from memory, if ticker counter has expired then re-fetch
 */
var poll = function(req, res) {
  api.ticker.rate(req.params.currency, function(err, rate) {
    res.json({currency: req.params.currency, rate: rate, err: err});
  });
};



/**
 * trade
 * need to add in a UID for this trade
 */
var trade = function(req, res) {
  api.trade.trade(req.body.fiat, req.body.satoshis, req.body.currency, function(err) {
    res.json({err: err});
  });
};



/**
 * send Bitcoins
 */
var send = function(req, res) {
  api.send.sendBitcoins(req.body.address, req.body.satoshis, function(err) {
    res.json({err: err});
  });
};



/**
 * initialize the api routes and attach to the express application object
 */
exports.init = function(app, config) {
  _config = config;

  api.init(_config.exchanges);

  testMode.enable(api);

  exports._tradeExchange = api._tradeExchange;
  exports._transferExchange = api._transferExchange;

  app.get('/poll/:currency', poll);
  app.post('/trade', trade);
  app.post('/send', send);
  return app;
};



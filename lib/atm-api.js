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

var api = require('./api/api');
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
  api.trade.trade(req.params.fiat, req.params.satoshis, req.params.currency, function(err) {





    log.purchase(new Date(), exchange, address, req.params.satoshis, status, err, function(err) {});
    res.json({err: err});
  });
};



/**
 * send Bitcoins
 */
var send = function(address, satoshis, cb) {
};



exports.setTransferDomain = function(domain) {
  api.setTransferDomain(domain);
};



/**
 * initialize the api routes and attach to the express application object
 */
exports.init = function(app, config) {
  _config = config;

  api.init(_config.exchanges);

  exports._tradeExchange = api._tradeExchange;
  exports._transferExchange = api._transferExchange;

  app.get('/poll/:currency', poll);
  app.get('/trade', trade);
  app.get('/send', send);
  return app;
};



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

var pg = require('pg');
var _conString = 'postgres://postgres:password@localhost/lamassu';



//var isInt = function (n) {
//  return n % 1 === 0;
//};



exports.purchase = function(timestamp, exchange, satoshis, currency, rate, status, errorMessage, cb) {
  exports.log(timestamp, 'purchase', exchange, '', satoshis, currency, rate, status, errorMessage, cb);
};



exports.send = function(timestamp, exchange, address, satoshis, status, errorMessage, cb) {
  exports.log(timestamp, 'send', exchange, address, satoshis, '', 0, status, errorMessage, cb);
};



exports.log = function(timestamp, type, exchange, address, satoshis, currency, rate, status, errorMessage, cb) {
  var client = new pg.Client(_conString);

  if (!cb) { cb = function() {}; }

  client.connect(function(err) {
    if(err) {
      cb(err, {ok:false, msg:'Failed to connect to database.'});
    }
    else {
      client.query({text:'insert into txlog(timestamp, type, exchange, address, satoshis, currency, rate, status, errorMessage) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                    values: [timestamp, type, exchange, address, satoshis, currency, rate, status, errorMessage]},
                    function(err) {
        if (err)  {
          cb(err, {ok:false, msg: 'Failed to save config.'});
        }
        else {
          cb(null, {ok:true});
        }
        client.end();
      });
    }
  });
};


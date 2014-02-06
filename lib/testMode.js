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

var https = require('https');



/**
 * replace the bitstamp node module request function with one that references localhost
 * for testing.
 */
var mockRequest = function(method, path, data, callback, args) {
  var options = {
    host: 'localhost',
    port: 3001,
    path: path,
    method: method,
    rejectUnauthorized: false,
    requestCert: true,
    agent: false,
    headers: {
      'User-Agent': 'Mozilla/4.0 (compatible; Bitstamp node.js client)'
    }
  };

  if(method === 'post') {
    options.headers['Content-Length'] = data.length;
    options.headers['content-type'] = 'application/x-www-form-urlencoded';
  }

  var req = https.request(options, function(res) {
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
 * enable test mode, all calls will route to local test emulator rather than the live exchanges
 */
exports.enable = function(api) {
  api._tradeExchange.client._request = mockRequest;
  // TODO: this should be behing a flag, and preferably we should provide a
  // mock
  api._transferExchange.host = 'localhost';
};



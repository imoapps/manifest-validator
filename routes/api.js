'use strict';

var manifestController  = require('../lib/manifest_controller'),
    isValidFunctionName = require('../lib/validate-function-name'),
    ga                  = require('../lib/analytics');



function cleanupLogUrl(param) {
  var output = [];

  // Strip directinput content from logging
  if (param && param.directinput) { param.directinput = ''; }

  for (var key in param) {
    output.push(key + '=' + param[key]);
  }
  return '/api/validate?' + output.join('&');
}


function logAPICall(req, param) {
  var userAgent = req.header('User-Agent') ? decodeURIComponent(req.header('User-Agent')) : '',
      loggedUrl = cleanupLogUrl(param);

  // Log API requests for debugging
  console.log('API call:',
    "\n\t" + req.method + ' ' + loggedUrl,
    "\n\tUser-Agent: " + userAgent
  );

  // Just log the User Agent in Google Analytics
  ga.trackPage(userAgent);
}


function dispatchAPI(req, res, param) {
  return function(result, status) {

    if (status) {
      return res.status(status).send(result);
    }

    logAPICall(req, param);

    var mimeType = 'application/json';
    var body = JSON.stringify(result);

    if (param && param.callback) {

      if (req.method !== 'GET') {
        return res.status('405').send({ errors: 'JSONP accepts only GET requests'});
      }

      var jsonpCallbackName = (isValidFunctionName(param.callback) ? param.callback : 'callback');
      mimeType = 'text/javascript';
      body = jsonpCallbackName + '(' + body + ')';
    }

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    res.header('Content-Type', mimeType + '; charset=utf-8');
    res.header('Content-Length', Buffer.byteLength(body, 'utf-8'));
    res.end(body);
  };
}


exports.index = function(req, res) {
  var body = JSON.stringify({
    api: {
      version       : '1.0',
      endpoint      : 'http://manifest-validator.com/api/validate',
      documentation : 'https://github.com/fhemberger/manifest-validator/wiki/API-Documentation'
    }
  }, null, '  ');
  res.header('Content-Type', 'application/json; charset=utf-8');
  res.header('Content-Length', Buffer.byteLength(body, 'utf-8'));
  res.end(body);
};


exports.validate = function(req, res) {
  manifestController.dispatch(dispatchAPI, req, res);
};


// Expose private functions in testing environment
if (process.env.NODE_ENV === 'test') {
  module.exports = {
    isValidFunctionName : isValidFunctionName,
    cleanupLogUrl       : cleanupLogUrl,
    logAPICall          : logAPICall,
    dispatchAPI         : dispatchAPI
  };
}

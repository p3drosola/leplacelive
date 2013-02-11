var twitter = require('ntwitter'),
express = require('express'),
fs = require('fs');

var twit, app = express(), clients = {}, port = process.env.PORT || 3000;

twit = new twitter({
  consumer_key: 'Fcs3fjPDs7w5JcjxGtOMQ',
  consumer_secret: 'NBQUvtoZeos6Y4T6mHXadr27S2vgCh98VJBqR7pAB4A',
  access_token_key: '115786338-jJoMMfQB0Qks2eeUbMgxDgd4wgkHI7H75ApULIRB',
  access_token_secret: '6p9jWQvGEv5sCVstxoFZIqeOzS4S2bzvnbuhVy8HlU'
});

twit.stream('statuses/filter', {
  //'follow' : 243508158,   // leplace
  'follow' : 1169136006,    // TesterGator
  'track' : 'leplace,leplacebcn'
}, function(stream) {
  stream.on('data', function (data) {
    handleTweet(data);
  });

  stream.on('error', function(error, code) {
    console.warn("error: " + error + ": " + code);
  });
});

// configure express
app.configure(function(){
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});



function bindStream (id, res) {
  clients[id] = res;
}

function unbindStream(id) {
  delete clients[id];
}

function handleTweet(data) {
  console.log('@' + data.user.screen_name + ' (' + data.user.screen_name + ')');
  console.log(data.text);

  Object.keys(clients).forEach(function (id) {
    sendData(id, data.text);
  });
}

function sendData(id, data) {
  var res = clients[id];
  console.log('sending', id, data);

  res.write('id: ' + id + '\n');
  res.write('event: data\n');
  res.write('data: ' + data.toString('utf8') + '\n\n');
}

app.get('/', function(req, res) {
  res.redirect('/index.html');
});

app.get('/events', function(req, res) {


  var id = (new Date()).getTime().toString();

  console.log('connected to /events ');

  res.header('Content-Type', 'text/event-stream');
  res.header('Cache-Control', 'no-cache');
  res.header('Connection', 'keep-alive');

  bindStream(id, res);
  console.log(Object.keys(clients));
  res.on('close', function() {
    unbindStream(id);
  });
});

app.listen(port);
console.log('running on port ' + port);
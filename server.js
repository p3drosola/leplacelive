var twitter = require('ntwitter'),
express = require('express'),
fs = require('fs');

var twit, app = express(), clients = {}, port = process.env.PORT || 3000;

var filter = {
  //'follow':'1254449029'
  'track' : 'leplace,leplacebcn,leplacelive,srframes'
},
seed_search = "leplacebcn",
seed_count = 15;

twit = new twitter({
  consumer_key: 'Fcs3fjPDs7w5JcjxGtOMQ',
  consumer_secret: 'NBQUvtoZeos6Y4T6mHXadr27S2vgCh98VJBqR7pAB4A',
  access_token_key: '115786338-jJoMMfQB0Qks2eeUbMgxDgd4wgkHI7H75ApULIRB',
  access_token_secret: '6p9jWQvGEv5sCVstxoFZIqeOzS4S2bzvnbuhVy8HlU'
});

twit.stream('statuses/filter', filter, function(stream) {
  stream.on('data', handleTweet);
  stream.on('error', handleError);
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

  var client_data = {
    id: data.id,
    username: data.user.screen_name,
    profile_image_url: large_profile_img(data.user.profile_image_url),
    text: data.text,
    photo_url: getPhotoUrl(data),
    time: data.created_at
  };

  Object.keys(clients).forEach(function (id) {
    sendData(id, client_data);
  });
}

function handleError(error, code) {
  console.warn("error: " + error + ": " + code);
}

function getPhotoUrl(data) {
  if (!data.entities.media || !data.entities.media.length) return null;
  if (data.entities.media[0].type !== 'photo') return null;
  return data.entities.media[0].media_url;
}


function sendData(id, data) {
  var res = clients[id];
  console.log('sending', id, data);

  res.write('id: ' + id + '\n');
  res.write('event: data\n');
  res.write('data: ' + JSON.stringify(data).toString('utf8') + '\n\n');
}

function prepareSeedData(data) {
  return data.results.map(function (tweet){
    return {
      id: tweet.id,
      username: tweet.from_user,
      profile_image_url: large_profile_img(tweet.profile_image_url),
      text: tweet.text,
      photo_url: getPhotoUrl(tweet),
      time: tweet.created_at
    };
  });
}

function large_profile_img(url) {
  return url.replace('_normal.png', '.png');
}

app.get('/', function(req, res) {
  res.redirect('/index.html');
});

app.get('/stream', function(req, res) {
  var id = (new Date()).getTime().toString();
  console.log('client connected to /stream ');

  res.header('Content-Type', 'text/event-stream');
  res.header('Cache-Control', 'no-cache');
  res.header('Connection', 'keep-alive');

  bindStream(id, res);
  console.log('clients:', Object.keys(clients));
  res.on('close', function() {
    unbindStream(id);
  });
});

app.get('/seed', function (req, res) {
  twit.search(seed_search, {include_entities: true, count: seed_count}, function (err, data) {
    if (err) res.end(500);
    data = prepareSeedData(data);
    res.header('Content-Type', 'text/json');
    res.send(JSON.stringify(data));
  });
});

app.listen(port);
console.log('LePlaceLive is running on port ' + port);
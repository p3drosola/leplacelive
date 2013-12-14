var client = require('twitter-api').createClient(),
    express = require('express'),
    fs = require('fs'),
    app = express(),
    clients = {},
    port = process.env.PORT || 3000,
    filter,
    seed_search,
    seed_count;

filter = {
  // 'follow' : '1254449029'
  'track' : 'leplace,leplacebcn,leplacelive,srframes'
};
seed_search = "leplacebcn";
seed_count = 15;

client.setAuth(
  'Fcs3fjPDs7w5JcjxGtOMQ', //consumer_key
  'NBQUvtoZeos6Y4T6mHXadr27S2vgCh98VJBqR7pAB4A', //consumer_secret
  '115786338-jJoMMfQB0Qks2eeUbMgxDgd4wgkHI7H75ApULIRB', // access_token_key
  '6p9jWQvGEv5sCVstxoFZIqeOzS4S2bzvnbuhVy8HlU' // access_token_secret
);

client.get('account/verify_credentials', { skip_status: true }, function (user, error, status) {
  if (user) {
    console.log('Authenticated as @' + user.screen_name);
  } else {
    console.log('Not authenticated');
    process.exit();
  }
});

client.stream('statuses/filter', { track: '#leplacetest' }, function (json) {
  var tweet = JSON.parse(json);
  if (tweet.text && tweet.user) {
    console.log(tweet.user.screen_name + ': "' + tweet.text + '"');
  }
});


// twit.stream('statuses/filter', filter, function(stream) {
//   stream.on('data', handleTweet);
//   stream.on('error', handleError);
// });

// configure express
app.configure(function () {
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function () {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function () {
  app.use(express.errorHandler());
});


// function bindStream (id, res) {
//   clients[id] = res;
// }

// function unbindStream(id) {
//   delete clients[id];
// }

function largeProfileImg(url) {
  return url.replace('_normal.png', '.png');
}

function handleTweet(data) {
  console.log('@' + data.user.screen_name + ' (' + data.user.screen_name + ')');
  console.log(data.text);

  var client_data = {
    id: data.id,
    username: data.user.screen_name,
    profile_image_url: largeProfileImg(data.user.profile_image_url),
    text: data.text,
    photo_url: getPhotoUrl(data),
    time: data.created_at
  };

  Object.keys(clients).forEach(function (id) {
    sendData(id, client_data);
  });
}

// function handleError(error, code) {
//   console.warn("error: " + error + ": " + code);
// }

function getPhotoUrl(data) {
  if (!data.entities.media || !data.entities.media.length) return null;
  if (data.entities.media[0].type !== 'photo') return null;
  return data.entities.media[0].media_url;
}


// function sendData(id, data) {
//   var res = clients[id];
//   console.log('sending', id, data);

//   res.write('id: ' + id + '\n');
//   res.write('event: data\n');
//   res.write('data: ' + JSON.stringify(data).toString('utf8') + '\n\n');
// }



function prepareSeedData(data) {
  return data.statuses.map(function (tweet) {
    return {
      id: tweet.id,
      username: tweet.user.screen_name,
      profile_image_url: largeProfileImg(tweet.user.profile_image_url),
      text: tweet.text,
      photo_url: getPhotoUrl(tweet),
      time: tweet.created_at
    };
  });
}



app.get('/', function (req, res) {
  res.redirect('/index.html');
});

// app.get('/stream', function (req, res) {
//   var id = (new Date()).getTime().toString();
//   console.log('client connected to /stream ');

//   res.header('Content-Type', 'text/event-stream');
//   res.header('Cache-Control', 'no-cache');
//   res.header('Connection', 'keep-alive');

//   bindStream(id, res);
//   console.log('clients:', Object.keys(clients));
//   res.on('close', function () {
//     unbindStream(id);
//   });
// });

app.get('/seed', function (req, res) {

  client.get('search/tweets', {q: 'leplacetest'}, function (json, error) {
    if (error) {
      res.send(error);
    } else {
      var data = prepareSeedData(json);
      res.header('Content-Type', 'text/json');
      res.send(JSON.stringify(data));
    }
  });
});

app.listen(port);
console.log('LePlaceLive is running on port ' + port);

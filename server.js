var client = require('twitter-api').createClient(),
    express = require('express'),
    request = require('request'),
    fs = require('fs'),
    async = require('async'),
    app = express(),
    clients = {},
    port = process.env.PORT || 3000,
    search = "#leplace OR #leplacebcb OR #57party",
    track = '#leplace,#leplacebcb,#57party';

client.setAuth(
  //consumer_key
  //consumer_secret
  // access_token_key
  // access_token_secret
);

client.get('account/verify_credentials', { skip_status: true }, function (user, error, status) {
  if (user) {
    console.log('Authenticated as @' + user.screen_name);
  } else {
    console.log('Not authenticated');
    process.exit();
  }
});

client.stream('statuses/filter', { track: track }, function (json) {
  var tweet = JSON.parse(json);
  if (tweet.text && tweet.user) {
    handleNewTweet(tweet);
  }
});

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


function bindStream (id, res) {
  clients[id] = res;
}

function unbindStream(id) {
  delete clients[id];
}

function largeProfileImg(url) {
  return url.replace('_normal.', '.');
}

function handleNewTweet(tweet) {
  console.log('@' + tweet.user.screen_name + ' : "' + tweet.text + '"');
  extractData(tweet, function (error, data) {
    Object.keys(clients).forEach(function (id) {
      sendData(id, data);
    });
  });
}

function getPhotoUrl(data) {
  if (!data.entities.media || !data.entities.media.length) return null;
  if (data.entities.media[0].type !== 'photo') return null;
  return data.entities.media[0].media_url;
}

function extractData(tweet, callback) {

  var link_regex, image_regex, link_match, data;

  data = {
    id: tweet.id,
    username: tweet.user.screen_name,
    profile_image_url: largeProfileImg(tweet.user.profile_image_url),
    text: tweet.text,
    photo_url: getPhotoUrl(tweet),
    time: tweet.created_at
  };

  if (tweet.source.match('Instagram')) {
    link_regex = /(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?/;
    image_regex = /og:image"\scontent="([^"]+)"/igm;
    link_match = link_regex.exec(tweet.text);

    if (link_match && link_match[0]) {
      request(link_match[0], function (error, response, body) {
        if (!error && response.statusCode === 200) {
          data.photo_url = image_regex.exec(body)[1];
        }
        callback(null, data);
      });
    } else {
      callback(null, data);
    }
  } else {
    callback(null, data);
  }
}

function sendData(id, data) {
  var res = clients[id];
  console.log('sending', id, data);

  res.write('id: ' + id + '\n');
  res.write('event: data\n');
  res.write('data: ' + JSON.stringify(data).toString('utf8') + '\n\n');
}


app.get('/', function (req, res) {
  res.redirect('/index.html');
});

app.get('/stream', function (req, res) {
  var id = (new Date()).getTime().toString();
  console.log('client connected to /stream ', id);

  res.header('Content-Type', 'text/event-stream');
  res.header('Cache-Control', 'no-cache');
  res.header('Connection', 'keep-alive');

  bindStream(id, res);
  console.log('clients:', Object.keys(clients));
  res.on('close', function () {
    unbindStream(id);
  });
});

app.get('/seed', function (req, res) {
  client.get('search/tweets', {q: search}, function (json, error) {
    if (error) {
      res.send(error);
    } else {
      async.map(json.statuses, extractData, function (error, results) {
        if (error) {
          res.send('error loading seed: ' + JSON.stringify(error));
        } else {
          res.header('Content-Type', 'text/json');
          res.send(JSON.stringify(results));
        }
      });
    }
  });
});

app.listen(port);
console.log('LePlaceLive is running on port ' + port);

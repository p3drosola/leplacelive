(function () {

  var live = {};
  window.live = live;

  live.tweets = [];
  live.old_tweets_interval = 5000;
  live.new_tweet_interval = 10000;

  live.loadSeedData = function (callback) {
    live.tweets = $.getJSON('/seed', function (data) {
      live.tweets = data;
      if (data.length) {
        live.next();
        if (callback) callback();
      }
    });
  };

  live.subscribe = function () {
    live.events = new EventSource("/stream");
    live.events.addEventListener('data', live.onTweet, false);
  };

  live.next = function (tweet) {
    if (!tweet) tweet = live.randomTweet();
    live.showTweet(tweet);
    live.timer = setTimeout(live.next, live.old_tweets_interval);
  };

  live.randomTweet = function () {
    return live.tweets[Math.floor(Math.random()*live.tweets.length)];
  };

  live.onTweet = function (event) {
    var data = JSON.parse(event.data);
    live.tweets.push(data);

    clearInterval(live.timer);
    live.showTweet(data);
    live.timer = setTimeout(live.next, live.new_tweet_interval);
  };

  live.showTweet = function (tweet) {
    $("body").text(tweet.text);

    if (tweet.photo_url) {
      $('<img>', { src: tweet.photo_url }).appendTo('body');
    }
  };

  $(function () {
    live.loadSeedData(live.subscribe);
  });

}());
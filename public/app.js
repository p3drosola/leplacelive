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
        live.next(live.tweets[0]);
        if (callback) callback();
      } else {
        var reload = confirm('There are no tweets to display. Reload?');
        if (reload) {
          window.location = window.location;
        }
      }

    });
  };

  live.subscribe = function () {
    live.events = new EventSource("/stream");
    live.events.onerror = function () {
      console.log('failed to load stream. reloading...');
      window.location = window.location;
    };
    live.events.addEventListener('data', live.onTweet, false);
  };

  live.next = function (tweet) {
    if (!tweet) tweet = live.randomTweet();
    live.showTweet(tweet);
    live.timer = setTimeout(live.next, live.old_tweets_interval);
  };

  live.randomTweet = function () {
    if (live.tweets.length === 1) {
      return live.tweets[0];
    }
    tweet = live.tweets[Math.floor(Math.random()*live.tweets.length)];
    if (tweet.id !== live.active_tweet_id) {
      return tweet;
    }
    return live.randomTweet();
  };

  live.onTweet = function (event) {
    var data = JSON.parse(event.data);
    live.tweets.push(data);

    clearInterval(live.timer);
    live.showTweet(data);
    live.timer = setTimeout(live.next, live.new_tweet_interval);
  };

  live.showTweet = function (tweet) {

    live.active_tweet_id = tweet.id;

    $('.text-wrapper').children().fadeOut(300);
    setTimeout(function () {
      $('.avatar').attr('src', tweet.profile_image_url);
      $('h2.name').text('@' + tweet.username);
      $('.time').text(parseTwitterDate(tweet.time));
      $(".tweet-text").text(tweet.text);

      if (tweet.photo_url) {
        var $photowrap = $('.photo-wrapper');
        var img = $('<img>', { src: tweet.photo_url , 'class':'unloaded'});
        img.load(positionImage);
        $photowrap.html(img);
      }

      $('.text-wrapper, .photo-wrapper').toggleClass('only-text', !tweet.photo_url);

      $('.text-wrapper').children().fadeIn();
    }, 300);
  };

  live.parseHashTags = function (text) {
    var matcher = new RegExp(/(\#[^\w])/, "ig" );
    return s.replace(matcher, "<strong>$1</strong>");
  };

  function parseTwitterDate(tdate) {
    var system_date = new Date(Date.parse(tdate));
    var user_date = new Date();
    var diff = Math.floor((user_date - system_date) / 1000);
    if (diff <= 1) {return "just now";}
    if (diff < 20) {return diff + " seconds ago";}
    if (diff < 40) {return "half a minute ago";}
    if (diff < 60) {return "less than a minute ago";}
    if (diff <= 90) {return "one minute ago";}
    if (diff <= 3540) {return Math.round(diff / 60) + " minutes ago";}
    if (diff <= 5400) {return "1 hour ago";}
    if (diff <= 86400) {return Math.round(diff / 3600) + " hours ago";}
    if (diff <= 129600) {return "1 day ago";}
    if (diff < 604800) {return Math.round(diff / 86400) + " days ago";}
    if (diff <= 777600) {return "1 week ago";}
    return "on " + system_date;
  }


  function positionImage () {
    var $photowrap = $('.photo-wrapper');
    var $img = $('.photo-wrapper img');
    var x = $img.width() / $photowrap.width();
    var y = $img.height() / $photowrap.height();

    var t = (x > y);

    $img.toggleClass('horizontal', t);
    $img.toggleClass('vertical', !t);

    if (t) {
      var margin = ($photowrap.height() - $img.height()) / 2;
      $img.css({marginTop: margin + 'px'});
    }
    $img.removeClass('unloaded');
  }

  $(function () {
    live.loadSeedData(live.subscribe);
  });

}());

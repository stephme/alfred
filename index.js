/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 ______    ______    ______   __  __    __    ______
 /\  == \  /\  __ \  /\__  _\ /\ \/ /   /\ \  /\__  _\
 \ \  __<  \ \ \/\ \ \/_/\ \/ \ \  _"-. \ \ \ \/_/\ \/
 \ \_____\ \ \_____\   \ \_\  \ \_\ \_\ \ \_\   \ \_\
 \/_____/  \/_____/    \/_/   \/_/\/_/  \/_/    \/_/

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

var Botkit = require('botkit');
var _ = require('lodash');
var mongo = require('mongodb');
var moment = require('moment');

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.PORT || !process.env.VERIFICATION_TOKEN) {
    console.log('Error: Specify CLIENT_ID, CLIENT_SECRET, VERIFICATION_TOKEN and PORT in environment');
    process.exit(1);
}

var config = {}
if (process.env.MONGODB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = { storage: BotkitStorage({ mongoUri: process.env.MONGODB_URI }) };
} else {
    config = { json_file_store: './db/' };
}

var controller = Botkit.slackbot(config).configureSlackApp({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    scopes: ['commands'],
});

controller.setupWebserver(process.env.PORT, function (err, webserver) {
    controller.createWebhookEndpoints(controller.webserver);

    controller.createOauthEndpoints(controller.webserver, function (err, req, res) {
        if (err) {
            res.status(500).send('ERROR: ' + err);
        } else {
            res.send('Success!');
        }
    });
});

// ------------------------------------------------------------------------------

var DEV_MONGODB_URI = "mongodb://localhost:27017/whoshere";

var mongoClient = mongo.MongoClient;
var mongoUrl = process.env.MONGODB_URI || DEV_MONGODB_URI;

function connectToMongo(callback) {
  mongoClient.connect(mongoUrl, function(err, db) {
    if (err) throw err;
    callback(db);
  });
};

connectToMongo(function(db) {
  db.createCollection('locations', function(err, collection) {
    if (err) throw err;
    collection.createIndex({ user: 1, period: 1 }, { unique: true }, function(err, result) {
      console.log('** database ready **');
      db.close();
    });
  });
});

// ------------------------------------------------------------------------------

Array.prototype.toSentence = function(comma, and) {
  var b = this.pop();
  if (b) {
    return (this.length ? [this.join(comma || ', '), b] : [b]).join(and || " and ");
  }
  return '';
};

var USER_TOKEN_RE = /^<@([A-Z0-9]+)\|(.+)>/;
var DATE_FORMAT = 'DD MM YYYY';
var DAY_FORMAT = 'dddd';
var WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
var AUTHORIZED_LOCATIONS = ['office', 'home', 'coworking'];
var ATTACHMENT_COLORS = {
  office: '#138A8A',
  home: '#A2D240',
  coworking: '#1014A4',
};
var MOMENT_CALENDAR = {
  sameDay: '[Today]',
  nextDay: '[Tomorrow]',
  nextWeek: 'dddd, MMMM D',
  sameElse: 'dddd, MMMM D'
};

var TIPS = {
  "/whoshere":
    "Check if you'll not be alone at the office. Try :\n" +
    "/whoshere (office | home | coworking | @stephme) [today | tomorrow | monday | tuesday | ...]",
  "/iamhere":
    "Inform others where you'll work at a given time. Try :\n" +
    "/iamhere (office | home | coworking) [today | tomorrow | monday | tuesday | ...]\n" +
    "_tomorrow is the default_\n" +
    "_*/hereiam* is a shorthand for `/iamhere office today`_"
};

function SENTENCE_PARTS(plural = false) {
  var verb = plural ? 'are' : 'is';
  return {
    verbosedLocation: {
      present: {
        office: verb + ' at the office',
        home: verb + ' home',
        coworking: verb + ' using a coworking space',
      },
      future: {
        office: 'will be at the office',
        home: 'will be home',
        coworking: 'will work in a coworking space',
      }
    },
    atLocation: {
      office: 'at the office',
      home: 'at home',
      coworking: 'in a coworking place',
    },
  };
}

function unableToProceedWithCommand(command, arg) {
  var sentences = [];
  if (!arg) {
    sentences.push(
      "I'm afraid I don't know how to proceed with the command *" + command + "* yet.",
      "*" + command + "* is not something I can understand yet.",
      "I don't understand *" + command + "* yet."
    );
  } else {
    sentences.push(
      "_" + arg + "_ is not a valid option for *" + command + "*. Type *" + command + " help* to check how it works.",
      "I don't understand _" + arg + "_. Type *" + command + " help* to check how it works."
    );
  }
  return _.sample(sentences);
}

function helpMessage(command) {
  return TIPS[command] || "No help for this command yet.";
}

function parseCommandArgs(message) {
  var args = message.text.split(' ');
  var key = (message.command === "/whoshere" && args[0].match(USER_TOKEN_RE)) ? 'user' : 'location';
  var value = key === 'user' ? args[0] : _.lowerCase(args[0]);
  if (key === 'location' && !AUTHORIZED_LOCATIONS.includes(value)) {
    return { error: unableToProceedWithCommand(message.command, args[0]) };
  }
  var result = { [key]: value };

  var now = moment();
  if (args.length > 1) {
    var period = _.lowerCase(args[1]);
    if (period === 'today') {
      result.period = now.format(DATE_FORMAT);
    } else if (period === 'tomorrow') {
      result.period = now.add(1, 'days').format(DATE_FORMAT);
    } else if (WEEK_DAYS.includes(period)) {
      var today = _.toLower(now.format(DAY_FORMAT));
      var indexOfToday = WEEK_DAYS.indexOf(today);
      if (indexOfToday > -1) {
        var i = (indexOfToday + 1) % WEEK_DAYS.length;
        while (WEEK_DAYS[i] !== period) {
          i = (i + 1) % WEEK_DAYS.length;
        }
        var diff = i <= indexOfToday ? (WEEK_DAYS.length - (indexOfToday - i)) : i - indexOfToday;
        result.period = now.add(diff, 'days').format(DATE_FORMAT);
      }
    } else {
      return { error: unableToProceedWithCommand(message.command, args[1]) };
    }
  } else if (message.command === "/iamhere") {
    // tomorrow is the default
    result.period = now.add(1, 'days').format(DATE_FORMAT);
  }

  return result;
}

function getSentencePart(id, values = {}) {
  if (id === 'period') {
    return moment(values.value, DATE_FORMAT).calendar(null, {
      sameDay: '[today]',
      nextDay: '[tomorrow]',
      nextWeek: '[on] dddd, MMMM D',
      sameElse: '[on] dddd, MMMM D'
    });
  } else {
    var obj = SENTENCE_PARTS(values.plural);
    if (values.period) {
      return obj[id][values.period === moment().format(DATE_FORMAT) ? 'present' : 'future'][values.value];
    }
    return obj[id][values.value];
  }
}

function whoshere(args, callback) {
  var answer = function(result) {
    callback(_.isArray(result) ? result.join(' ') : result);
  };

  find(args, function(res) {
    if (res.length) {
      if (args.period) {
        if (args.location) {
          answer([
            _.map(res, 'user').toSentence(),
            getSentencePart('verbosedLocation', {
              value: args.location,
              period: args.period,
              plural: res.length > 1,
            }),
            getSentencePart('period', { value: args.period }),
          ]);
        } else if (args.user) {
          answer([
            res[0].user,
            getSentencePart('verbosedLocation', {
              value: res[0].location,
              period: res[0].period,
            }),
            getSentencePart('period', { value: res[0].period }),
          ]);
        }
      } else {
        var today = moment().format(DATE_FORMAT);
        var filteredRes = _.filter(res, function (doc) { 
          return moment(doc.period).isSameOrAfter(today, 'day');
        });

        if (args.location) {
          // week-format-1 - office -> today: @stephme, ... | thursday: No one | friday: No one ...
          const formattedRes = _.chain(filteredRes).filter({ location: args.location }).groupBy('period').value();

          var attachments = [{
            color: ATTACHMENT_COLORS[args.location],
            fields: [],
          }];

          var periods = Object.keys(formattedRes);
          for (var period of periods) {
            attachments[0].fields.push({
              title: moment(period, DATE_FORMAT).calendar(null, MOMENT_CALENDAR),
              value: _.map(formattedRes[period], 'user').toSentence(),
              short: true,
            });
          }

          answer({ attachments: attachments });
        } else if (args.user) {
          // week-format-2 - @stephme -> today: office | thursday: home | friday: home...
          const formattedRes = _.chain(filteredRes).filter({ user: args.user }).groupBy('location').value();

          var text;
          if (_.get(formattedRes, 'office.length')) {
            var n = formattedRes.office.length;
            text = args.user + " will be at the office " + n + " time" + (n > 1 ? "s" : "") + " the next few days";
          } else {
            text = args.user + " is not at the office those days";
          }

          var attachments = [];
          for (var location of AUTHORIZED_LOCATIONS) {
            if (_.get(formattedRes, location + '.length')) {
              attachments.push({
                color: ATTACHMENT_COLORS[location],
                title: _.upperFirst(location),
                text: _.map(formattedRes[location], function(doc) {
                  return moment(doc.period, DATE_FORMAT).calendar(null, MOMENT_CALENDAR);
                }).join('\n'),
              });
            }         
          }

          answer({ text: text, attachments: attachments });
        }
      }
    } else if (args.period) {
      if (args.location) {
        answer([
          'It seems nobody',
          getSentencePart('verbosedLocation', {
            value: args.location,
            period: args.period
          }),
          getSentencePart('period', { value: args.period }),
        ]);
      } else if (args.user) {
        answer([
          'I have no idea what\'s doing',
          args.user,
          getSentencePart('period', { value: args.period }),
        ]);
      }
    } else {
      if (args.location) {
        answer([
          'I don\'t know who\'ll be',
          getSentencePart('atLocation', { value: args.location }),
          'this week'
        ]);
      } else if (args.user) {
        answer([
          'I don\'t have any information about',
          args.user,
          '\'s agenda',
        ]);
      }
    }
  });
}

function find(query, callback) {
  connectToMongo(function(db) {
    db.collection('locations').find(query).toArray(function(err, res) {
      if (err) throw err;
      db.close();
      callback(res);
    });
  });
}

function insert(query, callback) {
  find(_.omit(query, 'location'), function(res) {
    connectToMongo(function(db) {
      if (res.length) {
        db.collection('locations').update(res[0], _.merge({}, query), function(err, res) {
          if (err) throw err;
          db.close();
          callback();
        });
      } else {
        db.collection('locations').insert(_.merge({}, query), function(err, res) {
          if (err) throw err;
          db.close();
          callback();
        });
      }
    });
  });
}

function getUserFromMessage(message) {
  return "<@" + message.user_id + "|" + message.user_name + ">";
}

controller.on('slash_command', function (slashCommand, message) {
  if (message.command) {
    if (message.token !== process.env.VERIFICATION_TOKEN) return; // ignore the message

    if (Object.keys(TIPS).includes(message.command) &&
        (message.text == "" || message.text === "help")) {
      slashCommand.replyPrivate(message, helpMessage(message.command));
      return;
    }

    if (message.command === "/whoshere") {
      // "/whoshere" command
      var args = parseCommandArgs(message);
      if (args.error) {
        slashCommand.replyPrivate(message, args.error);
        return;
      }

      whoshere(args, function(result) {
        slashCommand.replyPrivate(message, result);
      });
    } else if (message.command === "/iamhere") {
      // "/iamhere" command
      var args = parseCommandArgs(message);
      if (args.error) {
        slashCommand.replyPrivate(message, args.error);
        return;
      }

      insert(_.merge(args, { user: getUserFromMessage(message) }), function() {
        whoshere(_.pick(args, ['location', 'period']), function(result) {
          slashCommand.replyPrivate(message, result);
        });
      });
    } else if (message.command === "/hereiam") {
      // "/hereiam" command
      var args = {
        user: getUserFromMessage(message),
        location: 'office',
        period: moment().format(DATE_FORMAT)
      };

      insert(args, function() {
        whoshere(_.pick(args, ['location', 'period']), function(result) {
          slashCommand.replyPrivate(message, result);
        });
      });
    } else {
      slashCommand.replyPrivate(message, unableToProceedWithCommand(message.command));
    }
  }
});
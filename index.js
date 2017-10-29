/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 ______    ______    ______   __  __    __    ______
 /\  == \  /\  __ \  /\__  _\ /\ \/ /   /\ \  /\__  _\
 \ \  __<  \ \ \/\ \ \/_/\ \/ \ \  _"-. \ \ \ \/_/\ \/
 \ \_____\ \ \_____\   \ \_\  \ \_\ \_\ \ \_\   \ \_\
 \/_____/  \/_____/    \/_/   \/_/\/_/  \/_/    \/_/


 This is a sample Slack Button application that provides a custom
 Slash command.

 This bot demonstrates many of the core features of Botkit:

 *
 * Authenticate users with Slack using OAuth
 * Receive messages using the slash_command event
 * Reply to Slash command both publicly and privately

 # RUN THE BOT:

 Create a Slack app. Make sure to configure at least one Slash command!

 -> https://api.slack.com/applications/new

 Run your bot from the command line:

 clientId=<my client id> clientSecret=<my client secret> PORT=3000 node bot.js

 Note: you can test your oauth authentication locally, but to use Slash commands
 in Slack, the app must be hosted at a publicly reachable IP or host.


 # EXTEND THE BOT:

 Botkit is has many features for building cool and useful bots!

 Read all about it here:

 -> http://howdy.ai/botkit

 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

/* Uses the slack button feature to offer a real time bot to multiple teams */
var Botkit = require('botkit');
var _ = require('lodash');

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.PORT || !process.env.VERIFICATION_TOKEN) {
    console.log('Error: Specify CLIENT_ID, CLIENT_SECRET, VERIFICATION_TOKEN and PORT in environment');
    process.exit(1);
}

var config = {}
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = { storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}) };
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

// Command to set default time : today, tomorrow, week...
// Change default for /iamhere command : today -> tomorrow ?

var TIPS = {
  "/whoshere":
    "Check if you'll not be alone at the office. Try :\n" +
    "/whoshere (office | home | @stephme) [today | tomorrow | thursday | week]\n" +
    "_today is the default_",
  "/iamhere":
    "Inform others where you'll work at a given time. Try :\n" +
    "/iamhere (office | home | coworking space | at @stephme's place) [today | tomorrow | thursday | week]\n" +
    "_today is the default_\n" +
    "_*/hereiam* is a shorthand for `/iamhere office today`_"
};

function unableToProceedCommand(command) {
  return _.sample([
    "I'm afraid I don't know how to " + command + " yet.",
    command + " is not something I can understand yet.",
    "Try a valid command instead because " + command + " is a shitty one."
  ]);
};

function helpCommand(command) {
  return TIPS[command] || "No help for this command yet.";
}

controller.on('slash_command', function (slashCommand, message) {
  if (message.command) {
    if (message.token !== process.env.VERIFICATION_TOKEN) return; // ignore the message

    if (Object.keys(TIPS).includes(message.command) &&
        (message.text == "" || message.text === "help")) {
      slashCommand.replyPrivate(message, helpCommand(message.command));
      return;
    }

    if (message.command === "/whoshere") {
      // "/whoshere" command
    } else if (message.command === "/iamhere") {
      // "/iamhere" command
      slashCommand.replyPrivate(message, "Yet to be done");
    } else if (message.command === "/hereiam") {
      // "/hereiam" command
      slashCommand.replyPrivate(message, "Yet to be done");
    } else {
      slashCommand.replyPrivate(message, unableToProceedCommand(message.command));
    }
  }
});
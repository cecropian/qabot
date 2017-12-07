var exec = require('child_process').exec;
var Botkit = require('./lib/Botkit.js');
var os = require('os');
var path = require('path');
var typeToFilter = '';
var responseLibrary = require(path.resolve('./responseLibrary.json'));
var controller = Botkit.slackbot({
  debug: true
});

var bot = controller.spawn({
  token: process.env.token
}).startRTM();

controller.hears(['forever services'], 'direct_message, direct_mention, mention', function (bot, message) {

  var shellCommand = 'sudo forever list';
  exec(shellCommand, function (error, stdout, stderr) {
    if (!error) {
      bot.reply(message, stdout);
    } else {
      bot.reply(message, 'error');
    }
  });

});

var currentMessage;

var devMessage = {
  channel: 'XXXX',
  user: 'XXXX',
  team: 'XXXX'
};

function executePermissions() {
  var codeBase = currentMessage.match[3].toLowerCase();                       // The suffix of the web-app directory (web-app.{dev|q
  var devResponse = currentMessage.match[0] + ' was sent by: ' + currentMessage.user;       // Message to send to the development team

  shellCommand = 'cd /srv; sudo chown www-data:www-data -R web-app.' + codeBase + '/*; sudo chmod 775 -R web-app.' + codeBase + '/*;';

  commandSuccess = exec(shellCommand, function (error, stdout, stderr) {
    if (!error) {
      bot.reply(currentMessage, 'There! I hope your happy now.\n' + getSillyMessage('disappointment'));
    } else {
      bot.reply(currentMessage, '\nSomething happend and I wasn\'t able to change the permissions for you.\n I, QABot, will inform the dev team.');
      bot.reply(devMessage, 'Error in BotKit executePermissions\n' + devResponse + '\nCommand Line output: ' + stdout + '\nexec error: ' + stderr);
    }
  });
}

controller.hears(['(^CHG|^Change) (PERM|permissions|permission|PERMS) on (DEV$|QA$)'], 'direct_message, direct_mention, mention', function (bot, message) {

  // messages
  var greetingMsg = getSillyMessage('greeting');
  currentMessage = message;

  stinkingBadges();
  setTimeout(surrenderMessage, 2000);
  setTimeout(executePermissions, 2000);

  function stinkingBadges() {
    bot.reply(message, greetingMsg + '\nPermission? To dog-damned hell with permission! I don\'t need no stinking permisson!!');
  }

  function surrenderMessage() {
    bot.reply(message, '' + '@*$%@#!!**! \nFine. I\'ll change the damned permissions...');
  }
});

// you added #'s need to just make it .*? or |
controller.hears(['(^TEST|^PASSED|^FAILED) on (QA|DEV) issue (KOM-[0-9]+$|ALL$)'], 'direct_message, direct_mention, mention', function (bot, message) {
  var action = message.match[1];                                     // Action the tester is specifying: TEST|PASSED|FAILED
  var codeBase = message.match[2].toLowerCase();                       // The suffix of the web-app directory (web-app.{dev|qa})
  var testerSubDomain = message.match[2].toUpperCase();                       // sub-domain of tester's URL (dev|qa)
  var gitBranch = message.match[3].toUpperCase();                       // Git branch, named after the JIRA issue, can also be ALL
  var jiraIssue = message.match[3].toUpperCase();                       // JIRA issue, can also be ALL
  var shellCommand = '';                                                   // Currently only applies to the command line
  var commandSuccess = false;
  var responseMessage;                                                        // Response message to send to requestor
  var devResponse = message.match[0] + ' was sent by: ' + message.user;       // Message to send to the development team
  var grepSearch = "Switched to branch '";
  var runStatus = false;
  var devMessage = {
    channel: 'G1PDEQ7PV',
    user: 'U1F4UESJZ',
    team: 'T0GP7BVDE'
  };

  // messages
  var greetingMsg = getSillyMessage('greeting');
  var encouragementMsg = getSillyMessage('encouragement');
  var congratulationsMsg = getSillyMessage('congratulations');
  var disappointmentMsg = getSillyMessage('disappointment');
  var funnyQuoteMsg = getSillyMessage('funny-quotes');


  bot.reply(message, greetingMsg + '\nI\'ll be back in 30 seconds or less and we\'ll see what\'s what ...');
  actOnRequest();
  function actOnRequest() {
    devResponse = message.match[0] + ' was sent by: ' + message.user;
    bot.reply(devMessage, devResponse);

    if (jiraIssue === 'ALL') {
      gitBranch = 'dev';
      shellCommand = 'cd /srv/web-app.' + codeBase + ';sudo git stash; sudo git pull; sudo git checkout ' + gitBranch + '; sudo git pull; sudo cp /srv/application.' + codeBase + '.xml application.xml;';
      responseMessage = 'ALL passed/done issues are updated on ' + testerSubDomain + '\n' + encouragementMsg;
      commandSuccess = exec(shellCommand, function (error, stdout, stderr) {
        if (!error) {
          // Do something good
        } else {
          // Do something to indicate an error
        }
      });

      setTimeout(checkStatus, 15000);

    } else {

      switch (action.toUpperCase()) {
        case 'TEST':
          shellCommand = 'cd /srv/web-app.' + codeBase + ';sudo git stash; sudo git pull; sudo git checkout ' + gitBranch + '; sudo git pull;';
          responseMessage = gitBranch + ' is ready for testing on ' + testerSubDomain + '\n' + encouragementMsg;
          commandSuccess = exec(shellCommand, function (error, stdout, stderr) {
          });

          //setTimeout(changePermissions, 15000);
          setTimeout(checkStatus, 15000);
          break;
        case 'PASSED':
          switch (testerSubDomain.toUpperCase()) {
            case 'QA':
              responseMessage = congratulationsMsg + '\nPlease move issue ' + gitBranch + ' to Done and assign to Eric.\n I, QABot, will inform the dev team!!';
              setTimeout(checkStatus, 15000);
              bot.reply(devMessage, devResponse);
              break;
            case 'DEV':
              responseMessage = congratulationsMsg + '\nPlease move issue ' + gitBranch + ' to Done and assign to Eric.\n I, QABot, will inform the dev team!!';
              setTimeout(checkStatus, 15000);
              break;
            default:
              responseMessage = disappointmentMsg + '\nSomething unexpected happened. \n I, QABot, will inform the dev team!!';
              bot.reply(devMessage, devResponse);
              break;
          }
          break;
        case 'FAILED':
          responseMessage = disappointmentMsg + '\nPlease move issue ' + gitBranch + ' back to Development and Unassign.';;
          setTimeout(checkStatus, 15000);
          break;
        default:
          responseMessage = disappointmentMsg + '\nSomething unexpected happened.  \n I, QABot, will inform the dev team!!';
          devResponse = message.match[0] + ' was sent by: that fell through the switches.';
          bot.reply(devMessage, devResponse);
          break;
      }
    }
  }

  function changePermissions() {
    // Change owner/group
    shellCommand = 'cd /srv; sudo chown www-data:www-data -R web-app.' + codeBase + '/*; sudo chmod 775 -R web-app.' + codeBase + '/*;';
    commandSuccess = exec(shellCommand, function (error, stdout, stderr) {
    });
  }

  // Already on ''
  // Switched to branch ''
  // error: pathspec ''
  // On branch (status)
  function checkStatus() {
    shellCommand = 'cd /srv/web-app.' + codeBase + '; git stash;';
    commandSuccess = exec(shellCommand, function (error, stdout, stderr) {
      if (!error) {
        // Do something good
      } else {
        // Do something to indicate an error
      }
    });
    setTimeout(changePermissions, 15000);
    var verificationCommand = 'cd /srv/web-app.' + codeBase + '; git status | grep "On branch";';
    commandSuccess = exec(verificationCommand, function (error, stdout, stderr) {
      var returnStatus = stdout;
      if (!error) {
        var requestedBranch = "On branch " + gitBranch;
        if (returnStatus.indexOf(requestedBranch) >= 0) {
          bot.reply(message, responseMessage);
        } else {
          responseMessage = 'I am so so sorry, but I was unable to switch to ' + gitBranch
            + '.\nYou are actually ' + returnStatus;
          if (action.toUpperCase() === 'FAILED' || action.toUpperCase() === 'PASSED') {
            var qaText = "";
            qaText = '\n Well anywho, I, QABot, am off to inform the dev team!!';
            responseMessage = 'Hey! I noticed you ' + action.toLowerCase() + ' issue ' + gitBranch
              + '.\n But you are actually ' + stdout + '\n Maybe this issue doesn\'t have a branch?' + qaText;
            bot.reply(devMessage, devResponse);
          }
          bot.reply(message, responseMessage);
          bot.reply(devMessage, devResponse);
        }
      } else {
        bot.reply(message, 'Some kind of err');
        // Do something to indicate an error
      }
    });
  }
});

controller.hears(['(^UNLOCK) on ([A-Z]+) user (.*$)'], 'direct_message, direct_mention, mention', function (bot, message) {
  var rawMessage = message.match[0];
  var actionCommand = message.match[1];
  var siteSubDomain = message.match[2].toLowerCase();
  var lockedUsername = message.match[3].toLowerCase();

  var responseMsg;
  var shellCommand;
  var sendMsg;

  bot.startConversation(message, function (err, convo) {

    convo.ask(`Are you certain user ${lockedUsername} is NOT logged in elsewhere?`, [
      {
        pattern: bot.utterances.yes,
        callback: function (response, convo) {
          shellCommand = `SELECT user_id FROM users WHERE username = ${lockedUsername};`;
          convo.say(`OK then. ${lockedUsername} should now be unlocked! ${shellCommand}`);
          convo.next();
        }
      },
      {
        pattern: bot.utterances.no,
        default: true,
        callback: function (response, convo) {
          convo.say('OK. I left user ' + lockedUsername + ' alone. Good-bye!');
          convo.next();
        }
      }
    ]);
  });
});

controller.hears(['(^CLEAN) database (QA$|DEV$|DEMO$)'], 'direct_message, direct_mention, mention', function (bot, message) {
  var rawMessage = message.match[0];
  var actionCommand = message.match[1];
  var siteSubDomain = message.match[2].toLowerCase();

  var responseMsg;
  var shellCommand;
  var sendMsg;

  bot.startConversation(message, function (err, convo) {
    convo.say('This will reset all data for the ' + siteSubDomain.toUpperCase() + ' sites. Leaving ONLY the admin user.');
    convo.ask('Are you certain this is what you want? This cannot be reversed!!', [
      {
        pattern: bot.utterances.yes,
        callback: function (response, convo) {
          shellCommand = `USE db_${siteSubDomain}; RUN clean-and-update.sql;`;
          convo.say('OK then. The database for the ' + siteSubDomain.toUpperCase() + ' site are now zestfully clean!\n' + shellCommand);
          convo.next();
        }
      },
      {
        pattern: bot.utterances.no,
        default: true,
        callback: function (response, convo) {
          convo.say('*Phew!* I\'m so happy! Do you know how much work that would have been? (Don\'t answer that!)');
          convo.next();
        }
      }
    ]);
  });
});

controller.hears(['call me (.*)', 'my name is (.*)'], 'direct_message, direct_mention, mention', function (bot, message) {
  var name = message.match[1];
  controller.storage.users.get(message.user, function (err, user) {
    if (!user) {
      user = {
        id: message.user,
      };
    }
    user.name = name;
    controller.storage.users.save(user, function (err, id) {
      bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
    });
  });
});

controller.hears(['shutdown'], 'direct_message, direct_mention, mention', function (bot, message) {

  bot.startConversation(message, function (err, convo) {

    convo.ask('Are you sure you want me to shutdown?', [
      {
        pattern: bot.utterances.yes,
        callback: function (response, convo) {
          convo.say('Laters!');
          convo.next();
          setTimeout(function () {
            process.exit();
          }, 3000);
        }
      },
      {
        pattern: bot.utterances.no,
        default: true,
        callback: function (response, convo) {
          convo.say('*Phew!*');
          convo.next();
        }
      }
    ]);
  });
});


controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
  'direct_message,direct_mention,mention', function (bot, message) {

    var hostname = os.hostname();
    var uptime = formatUptime(process.uptime());

    bot.reply(message,
      ':robot_face: I am a bot named <@' + bot.identity.name +
      '>. I have been running for ' + uptime + ' on ' + hostname + '.');

  });

function formatUptime(uptime) {
  var unit = 'second';
  if (uptime > 60) {
    uptime = uptime / 60;
    unit = 'minute';
  }
  if (uptime > 60) {
    uptime = uptime / 60;
    unit = 'hour';
  }
  if (uptime != 1) {
    unit = unit + 's';
  }

  uptime = uptime + ' ' + unit;
  return uptime;
}

function filterByType(value) {
  if (value.type === typeToFilter) {
    return true;
  } else {
    return false;
  }
}

function getSillyMessage(type) {
  typeToFilter = type;
  var greetings = responseLibrary.filter(filterByType);
  var greetingIndex = Math.floor(Math.random() * (greetings.length));
  return greetings[greetingIndex].text;
}

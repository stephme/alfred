# Alfred

![The loyal Alfred](/images/alfred.png)

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

<a href="https://slack.com/oauth/authorize?scope=incoming-webhook,commands&client_id=262284336982.260747569328"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>

Three commands are available so far :

- `/whoshere`: check if you'll not be alone at the office.

	`/whoshere (office | home | coworking | @stephme) [today | tomorrow | monday | tuesday | ...]`
 
- `/iamhere`: inform others where you'll work at a given time.

	`/iamhere (office | home | coworking) [today | tomorrow | monday | tuesday | ...]`

	*tomorrow is the default*

- `/hereiam` is a shorthand for `/iamhere office today`

To run locally :

`CLIENT_ID=xxx CLIENT_SECRET=xxx VERIFICATION_TOKEN=xxx PORT=8765 npm start`

`ngrok http 8765`

Change urls in slack app configuration... Then, go to : `https://{ngrok_url}/login`
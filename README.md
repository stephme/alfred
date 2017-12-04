# Alfred

![The loyal Alfred](/images/alfred.png)

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

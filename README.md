# TolokaChanBot
This bot supports searching with your or without any credentials on toloka.to.
Just send your query and it will answer with torrents that has most seeds.
If you want to keep your credentials while downloading torrents directly from the bot you can login using /login command.
You can test it here https://t.me/tolokachan_bot.
# deploy
Set all the tokens from provided in example.env file and save it as .env. Then run these commands:
>docker build -t tolokachanbot .

>docker run -d --restart=always --name TolokaChanBot tolokachanbot
### License 
The source code for the site is licensed under the [MIT](LICENSE) license.
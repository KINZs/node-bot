const SteamUser = require('steam-user');
const client = new SteamUser();
const SteamTotp = require('steam-totp');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
var mysql = require('mysql');


const logOnOptions = {
	accountName: '',
	password: '',
	twoFactorCode: SteamTotp.generateAuthCode('')
};

client.logOn(logOnOptions);

client.on('loggedOn', () => {
	console.log('Logged into Steam');

	client.setPersona(SteamUser.Steam.EPersonaState.Online);
	client.gamesPlayed("GIC BOT");

});

const community = new SteamCommunity();
const manager = new TradeOfferManager({
	steam: client,
	community: community,
	language: 'en'
});

client.on('webSession', (sessionid, cookies) => {
	manager.setCookies(cookies);

	community.setCookies(cookies);
	community.startConfirmationChecker(10000, '');
});

manager.on('newOffer', offer => {
	//getting steamid of sender

	var steamid = offer.partner.getSteam2RenderedID();


	if (offer.itemsToGive.length === 0) {
		offer.accept((err, status) => {
			if (err) {
				console.log(err);
			} else {

				offer.getExchangeDetails((err, status, tradeInitTime, receivedItems, sentItems) => {
					if (err) {
						console.log(`Error ${err}`);
						return;
					}

					// Create arrays of just the new assetids using Array.prototype.map and arrow functions

					let newReceivedItems = receivedItems.map(item => item.market_hash_name);
					let newSentItems = sentItems.map(item => item.market_hash_name);

					console.log(`Received items ${newReceivedItems.join(',')} Sent Items ${newSentItems.join(',')} - status ${TradeOfferManager.ETradeStatus[status]}`);

					//inserting tradevalue value into  mysql table

					var con = mysql.createConnection({
						host: "35.154.***.***",
						user: "",
						password: "",
						database: "donations"
					});

					con.connect(function (err) {
						if (err) throw err;
						var index;
						var itemvalue;
						var sum = 0;

						for (index = 0; index < newReceivedItems.length; index++) {
							con.query("SELECT value FROM smitems where itemName='" + newReceivedItems[index] + "'",
								function (err, rows) {
									if (err) throw err;

									if (rows.length == 0) {
										console.log('Non-marketable items in trade')
									} else {
										itemvalue = rows[0].value;
										console.log(itemvalue);

										var sql = "INSERT INTO tradeoffers(steamID, tradeValue) VALUES ('" + steamid + "', '" + itemvalue + "')";
										con.query(sql, function (err, result) {
											if (err) throw err;
											console.log("1 record inserted");
										});
									}

								});



						}

					});

				});



				console.log(`Donation accepted from ${steamid}. Status: ${status}.`);
				client.chatMessage(steamid, 'GIC BOT: Thank you for donations.');

				//DISCORD WEBHOOK
				var discord = require('discord-bot-webhook');
				discord.hookId = '420184552724627456';
				discord.hookToken = '_1deVYz6tK9yu8LuY7vx0iOzYfnnI0uIlci5lq9F8lHnRNOwVU1lDOLLUwKJHUg3Cfik';
				//var Hook = new Webhook("https://discordapp.com/api/webhooks/420184552724627456/_1deVYz6tK9yu8LuY7vx0iOzYfnnI0uIlci5lq9F8lHnRNOwVU1lDOLLUwKJHUg3Cfik");
				discord.sendMessage("New Donation from '" + steamid + "'");

			}
		});
	} else {
		offer.decline(err => {
			if (err) {
				console.log(err);
			} else {
				console.log('Donation declined (wanted our items).');
			}
		});
	}

	//if (offer.state == TradeOfferManager.ETradeOfferState.Accepted) {

	//}
});

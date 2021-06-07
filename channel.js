const axios = require("axios")
const path = require('path')
const config = require('dotenv').config({ path: path.join(__dirname, 'config.env') })
const { WebClient } = require('@slack/web-api');

const telegramToken = process.env.TELEGRAM_TOKEN
const token = process.env.SLACK_BOT_TOKEN
const conversationId = process.env.SLACK_CONVERSATION_ID
const bot_id = process.env.SLACK_BOTID
const web = new WebClient(token);


async function telegramAPI(_message) {
	const options = {
		url: `https://api.telegram.org/bot${telegramToken}/sendMessage`,
		method: "POST",
		data: {
			"chat_id": process.env.TELEGRAM_CHANNELID,
			"text": _message,
			"parse_mode": "Markdown"
		},
		validateStatus: (_status) => {
			return true
		}
	};
	let response = await axios(options);
	if(response.status != 200) {
		console.log(response.data)
		console.log(_message)
	}
};

async function sendToSlack(_message) {
	let result = await web.chat.postMessage({
    text: _message,
    channel: conversationId,
  });
}

async function cleanUpMessagesFromSlack(){
	result = await web.conversations.history({ channel: conversationId })
  messages = result.messages.filter(_message => _message.bot_id == bot_id)
  messages.forEach(async _message => await web.chat.delete({ channel: conversationId, ts: _message.ts }) )
}

module.exports = async channelData => {
	// console.log(channelData)
	let message = `${channelData.district} \n`

	channelData.week.forEach(week => {
		message += `Week starting ${week[0]}\n${week[1]}\n`
	})

	let slackMessage = null
	let telegramMessage = null

	if (channelData.channels.indexOf("slack") > -1) slackMessage = "```" + message + "```"
	if (channelData.channels.indexOf("telegram") > -1) telegramMessage = message

	if(slackMessage) {
		await cleanUpMessagesFromSlack()
		await sendToSlack(slackMessage)
	}

	if (telegramMessage) await telegramAPI(telegramMessage)
}
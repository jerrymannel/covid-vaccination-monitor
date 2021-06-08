const axios = require("axios")
const path = require('path')
const config = require('dotenv').config({ path: path.join(__dirname, 'config.env') })
const { WebClient } = require('@slack/web-api');

const monitoringList = require('./monitorList')

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

	let listOfDistricts = {
		slack: [],
		telegram: []
	}
	monitoringList.forEach(district => {
		if(district[3].indexOf('slack') != -1) listOfDistricts.slack.push(district[1])
		if(district[3].indexOf('telegram') != -1) listOfDistricts.telegram.push(district[1])
	})

	let messageHeader = `Data fetched at ${new Date().toLocaleString()}\n`
	messageHeader += "===========================\n\n"
	
	if (channelData.slack.length > 0 ) {
		await cleanUpMessagesFromSlack()
		await sendToSlack(`Vaccine availability for the districts - ${listOfDistricts.slack.join(", ")}\n` + messageHeader + channelData.slack.join("\n"))
	}

	if (channelData.telegram.length > 0 ) await telegramAPI(`Vaccine availability for the districts - ${listOfDistricts.telegram.join(", ")}\n` + messageHeader + channelData.telegram.join("\n"))
}
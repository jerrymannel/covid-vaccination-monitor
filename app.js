const axios = require("axios")
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const config = require('dotenv').config({ path: path.join(__dirname, 'config.env') })
const { WebClient } = require('@slack/web-api');

const telegramToken = process.env.TELEGRAM_TOKEN

const token = process.env.SLACK_BOT_TOKEN
const conversationId = process.env.SLACK_CONVERSATION_ID
const bot_id = process.env.SLACK_BOTID
const web = new WebClient(token);

const RAWDATA = path.join(__dirname, "RAWDATA")
if(!fs.existsSync(RAWDATA)) fs.writeFileSync(RAWDATA, "")

const monitoringList = require('./monitorList.js')

const URLS = {
	states: "https://cdn-api.co-vin.in/api/v2/admin/location/states",
	districts: "",
	vaccinationCenters: "https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict"
}

let telegramMessages = []

async function api(url) {
	const options = {
		url: url,
		method: "GET",
		headers: {
			"referer": "https://www.cowin.gov.in/",
			"user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36"
		},
		validateStatus: (_status) => {
			return true
		}
	};
	return axios(options);
};

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

function weekGenerator(){
	dates = []
	let date = new Date()
	i = 0;
	while (i < 1) {
		dates.push(`${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`)
		date.setDate(date.getDate() + 7)
		i++
	}
	return dates
}

function padData(data, length, character) {
	paddingLength = length - data.length
	while (paddingLength > 0) {
		data = `${character}${data}`
		paddingLength--;
	}
	return data
}

function beautifyCenterData(data){
	let maxCapacityLength1 = 0
	let maxCapacityLength2 = 0
	data.forEach(d => {
		if(d[2].length > maxCapacityLength1) maxCapacityLength1 = d[2].length
		if(d[3].length > maxCapacityLength2) maxCapacityLength2 = d[3].length
	})
	data.forEach(d => {
		d[2] = `[ ${padData(d[2], maxCapacityLength1, 0)}/D1`
		d[3] = `${padData(d[3], maxCapacityLength2, 0)}/D2 ]`
	})
	data = data.map(d => d.join(" "))
	return data
}

function processCenterData(centerData, age){
	
	if(centerData.length == 0) return "No centers"

	let telegramMessages = []
	centerData.forEach(_d => {
		let sessions = _d.sessions.filter(_session => {
			// return _session.min_age_limit == 18 && _session.available_capacity > 0 && _session.available_capacity_dose1 > 0
			return _session.min_age_limit <= age && _session.available_capacity > 0
		})
		let telegramPrefix = `${_d.pincode} ${_d.name}`
		sessions.forEach(_session => telegramMessages.push([_session.date, _session.min_age_limit, _session.available_capacity_dose1.toString(), _session.available_capacity_dose2.toString(), _session.vaccine.substr(0, 5), telegramPrefix]))
	})

	telegramMessages = telegramMessages.sort(_message => _message[1] == 18 ? -1 : 1)

	telegramMessages = beautifyCenterData(telegramMessages)
	
	if(telegramMessages.length > 0 ) return telegramMessages.join("\n")
	return "No slots"
}

async function processData(apiReponse, district, week){
	let message = "================================\n"
	message += `Data fetched at ${new Date().toLocaleString()}\n`
	message += "================================\n"
	message += `*${district[1]}*\n`
	let processedData = processCenterData(apiReponse.centers, district[2])
	if(processedData.indexOf("No") == 0 ) message += `Week of *${week}* : ${processedData}`
	else message += `Week of *${week} : AVAILABLE *\n${processedData}`
	message += "\n--------------------------------\n"
	return message
}

async function fetchData(){
	week = weekGenerator()
	let writer = fs.createWriteStream(RAWDATA);
	await monitoringList.reduce(async (_previous, currDistrict) => {
		await _previous
		let dataToWrite = { district: currDistrict, week: [] }
		await week.reduce(async (_p, currentWeek) => {
			await _p;
			// fetch the data for the week
			let response = await api(`${URLS.vaccinationCenters}?date=${currentWeek}&district_id=${currDistrict[0]}`)
			let processedData = processData(response.data, currDistrict, currentWeek)
			dataToWrite.week.push([currentWeek, processedData])
		}, Promise.resolve())
		writer.write(`${JSON.stringify(dataToWrite)}\n`)
		console.log(`Fetched data for ${currDistrict[1]}`)
	}, Promise.resolve())
	writer.close()
}

(async function () {
	try {
		await fetchData()
		// let message = await processData(RAWDATA_KERALA, 18)
		// await telegramAPI(message)
		// message = await processData(RAWDATA_KA, 18)
		// await cleanUpMessagesFromSlack()
		// await sendToSlack(message)
	} catch(error){
		console.log(error)
	}
})()
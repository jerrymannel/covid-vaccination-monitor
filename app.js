const axios = require("axios")
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const config = require('dotenv').config({ path: path.join(__dirname, 'config.env') })

const RAW_API_DATA = path.join(__dirname, "RAW_API_DATA")
if(!fs.existsSync(RAW_API_DATA)) fs.writeFileSync(RAW_API_DATA, "")

const monitoringList = require('./monitorList')
const dataProcessor = require("./dataProcessor");
const channel = require("./channel");

const cowinAPI = "https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict" 

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

async function processData(apiReponse, district, week){
	let inputStreamReader = readline.createInterface({
		input: fs.createReadStream(RAW_API_DATA),
		crlfDelay: Infinity
	})
	let processedWeekData = {
		slack: [],
		telegram: []
	}
	for await (let line of inputStreamReader) {
		processedData = dataProcessor(JSON.parse(line))
		if (processedData) {
			if(processedData.slack) processedWeekData.slack.push(processedData.slack)
			if(processedData.telegram) processedWeekData.telegram.push(processedData.telegram)
		}
	}
	// console.log(processedWeekData)
	await channel(processedWeekData)
}

async function fetchData(){
	week = weekGenerator()
	let writer = fs.createWriteStream(RAW_API_DATA);
	await monitoringList.reduce(async (_previous, currDistrict) => {
		await _previous
		let dataToWrite = { district: currDistrict, week: [] }
		await week.reduce(async (_p, currentWeek) => {
			await _p;
			// fetch the data for the week
			let response = await api(`${cowinAPI}?date=${currentWeek}&district_id=${currDistrict[0]}`)
			// write data to file
			dataToWrite.week.push([currentWeek, response.data])
		}, Promise.resolve())
		writer.write(`${JSON.stringify(dataToWrite)}\n`)
		console.log(`Fetched data for ${currDistrict[1]}`)
	}, Promise.resolve())
	writer.close()
}

(async function () {
	try {
		await fetchData()
		await processData()
	} catch(error){
		console.log(error)
	}
})()
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const config = require('dotenv').config({ path: path.join(__dirname, '../config.env') })

const RAW_API_DATA = path.join(__dirname, "RAW_API_DATA");

const dataProcessor = require("../dataProcessor");
const channel = require("../channel");

console.clear();

async function init() {
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
	console.log(processedWeekData)
}

init()
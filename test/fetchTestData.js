const axios = require("axios")
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const config = require('dotenv').config({ path: path.join(__dirname, '../config.env') })

const monitoringList = require('../monitorList.js')

const cowinAPI = "https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict" 

const RAW_API_DATA = path.join(__dirname, "RAW_API_DATA")
if(!fs.existsSync(RAW_API_DATA)) fs.writeFileSync(RAW_API_DATA, "")

function weekGenerator(){
	dates = []
	let date = new Date()
	i = 0;
	while (i < process.env.WEEKS) {
		dates.push(`${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`)
		date.setDate(date.getDate() + 7)
		i++
	}
	return dates
}

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

(async function fetchData(){
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
})()
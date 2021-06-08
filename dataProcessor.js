const path = require('path')

const config = require('dotenv').config({ path: path.join(__dirname, 'config.env') });

function sortByKey(centers, key) {
	centers.sort((p,c) => {
		let varP = p[key].toString().toUpperCase()
		let varC = c[key].toString().toUpperCase()
		if (varP < varC) return -1
		if (varP > varC) return 1
		return 0;
	})
	return centers
}

function padData(data, length, character) {
	paddingLength = length - data.length
	while (paddingLength > 0) {
		data = `${character}${data}`
		paddingLength--;
	}
	return data
}

function formatMessage(availableCenters){
	if(availableCenters == {}) return null;
	// console.log(availableCenters)

	let centerNames = Object.keys(availableCenters)
	let messages = ""

	centerNames.forEach(centerName => {
		let sessionString = ""
		sortByKey(availableCenters[centerName], "min_age_limit")
		availableCenters[centerName].forEach(session => {
			sessionString += session.date
			sessionString += `  ${padData(session.available_capacity_dose1.toString(), 3, "0")}/D1`
			sessionString += ` ${padData(session.available_capacity_dose2.toString(), 3, "0")}/D2`
			sessionString += `  ${session.min_age_limit}y`
			sessionString += " " + session.vaccine.substr(0, 5)
			sessionString += ` ${session.pincode} ${centerName}\n`
		})
		messages += sessionString
	})

	return messages
}

function processWeekData(ageLimit, weekData) {
	const weekDate = weekData[0]
	const centers = weekData[1].centers

	if(centers.length == 0) return null

	const availableCenters = {}

	sortByKey(centers, "name")

	centers.forEach(center => {
		let {pincode, name} = center

		const sessions = center.sessions.filter(_session => ageLimit.indexOf(_session.min_age_limit) != -1 && _session.available_capacity )

		sessions.forEach(session => {
			let {date, vaccine, available_capacity_dose1, available_capacity_dose2, min_age_limit} = session
			if (!availableCenters[name]) availableCenters[name] = []
			availableCenters[name].push({pincode, name, date, min_age_limit, vaccine, available_capacity_dose1, available_capacity_dose2})
		})
	})

	let formattedMessage = formatMessage(availableCenters)

	if (formattedMessage.length > 0) return `Week starting *${weekDate}*\n${formattedMessage}\n`
	return null
}


module.exports = (districtData) => {
	const district = districtData.district[1]
	const ageLimit = districtData.district[2]
	const channels = districtData.district[3]

	let messageHeader = `*${district}* _(Age group: ${ageLimit.join(", ")})_\n`
	messageHeader += `----------------------------------------\n`
	let messageBody = ''
	districtData.week.forEach(week => {
		let processedData = processWeekData(ageLimit, week)
		if(processedData) messageBody += processedData
	})

	if(messageBody != "") {
		let outputMessage = {}
		channels.forEach(channel => outputMessage[channel] = messageHeader + messageBody)
		return outputMessage
	}
	return null
}
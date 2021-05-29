# covid-vaccination-monitor
Check for vaccine availability and notify via Telegram and Slack

**Sample notification**

```
================================
Data fetched at 5/29/2021, 10:00:10 PM
================================
Bangalore Rural
29-5-2021 : No slots
--------------------------------
Bangalore Urban
29-5-2021 : AVAILABLE
29-05-2021 18 [ 0/D1 048/D2 ] COVIS 560099 Narayana Hrudayalaya Pvt Ltd
29-05-2021 18 [ 0/D1 100/D2 ] COVIS 560100 SYNGENE INTERNATIONAL LIMITED
--------------------------------
```

Table of contents

- [covid-vaccination-monitor](#covid-vaccination-monitor)
- [Configuration](#configuration)
	- [Telegram Bot](#telegram-bot)
	- [Slack App](#slack-app)
	- [Adding districts to track vaccine availability.](#adding-districts-to-track-vaccine-availability)
- [Notification](#notification)
- [Ethical Usage](#ethical-usage)

# Configuration

All configurations are saved under `config.env`. There are 4 values you have to set depending on where you want to receive the notification.

## Telegram Bot

Follow the instructions given here - [How do I create a bot?](https://core.telegram.org/bots#3-how-do-i-create-a-bot)

Once you have created a bot save the token as `TELEGRAM_TOKEN`

## Slack App

1. Create a new Slack app / Edit an existing app
2. Under **Features > OAuth & Permissions > Scopes**, add the following *OAuth Scopes* - `channels:history` and `chat:write`.
3. Save and install
4. Copy **Bot User OAuth Token**.This will be the value of `SLACK_BOT_TOKEN` under config.env.
5. Create a new channel and add this Slack app to it or add the slack app to an existing channel.
6. Right click on the Slack channel > Copy Link. The link will be of the format - https://sample.slack.com/archives/{conversationID}. Save _conversationID_ as `SLACK_CONVERSATION_ID`
7. Right click on the bot > Copy link. The link will be of the format - https://sample.slack.com/services/{botID}?settings=1. Save *botID* as `SLACK_BOTID`

## Adding districts to track vaccine availability.

1. Visit [Co-win website](https://www.cowin.gov.in/home)
2. Open browser inspect and switch to Network tab
3. Search by district and inspect the API.

The API is `https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict`. This takes two params

* *date*: The today's date in dd-mm-yyyy format 
* *district_id*: The district for which you are searching. This is a number

Take a note of the district id and name.

The code that has been checked in tracks a few districts. This is defined at line 21 under `app.js`.

```
const kerala_districts = [
	[301, "Alappuzha"],
	[307, "Ernakulam"],
	[298, "Kollam"],
	[304, "Kottayam"],
	[300, "Pathanamthitta"],
	[296, "Thiruvananthapuram"],
]

const karnataka_districts = [
	[276, "Bangalore Rural"],
	[265, "Bangalore Urban"],
	[294, "BBMP"],
]
```

Edit this list with more districts to track.

# Notification

> N.B. The current code sends the Kerala data to telegram and Karnataka data to Slack.

```
03-06-2021 18 [ 0/D1 04/D2 ] COVIS 560010 ST THERESAS HOSPITAL
```

Each line has the following data - 

* Date
* Age
* Availability of vaccine dose
* Type of vaccine
* Pincode
* Name of center

# Ethical Usage

* Do not aggressively call the APIs. I'm checking the availability every 30mins.
* Fetch the data for those districts that you really want to. I added 6 districts of Kerala considering a driving radius of 3hrs oneway.
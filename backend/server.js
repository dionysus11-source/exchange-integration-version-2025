
const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

let monitoring = false;
let interval;
let settings = {
    upperLimit: null,
    lowerLimit: null,
    telegramToken: null,
    telegramChatId: null
};

let bot;

const cheerio = require('cheerio');

const getExchangeRate = async () => {
    console.log('Attempting to fetch exchange rate from Naver Stock...');
    try {
        const response = await axios.get('https://m.stock.naver.com/marketindex/exchange/FX_USDKRW', {
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        console.log('Successfully received response from Naver Stock.');
        const $ = cheerio.load(response.data);
        const rateText = $('.DetailInfo_price__3K24A').text().replace(/,/g, '');
        if (!rateText) {
            console.error('Could not find exchange rate element on the page.');
            return null;
        }
        console.log(`Found rate text: ${rateText}`);
        const rate = parseFloat(rateText);
        console.log(`Parsed rate: ${rate}`);
        return rate;
    } catch (error) {
        console.error('Error getting exchange rate:', error.message);
        return null;
    }
};

const sendMessage = async (message) => {
    if (bot && settings.telegramChatId) {
        try {
            await bot.sendMessage(settings.telegramChatId, message);
        } catch (error) {
            console.error('Error sending telegram message:', error);
        }
    }
};

const checkRate = async () => {
    const rate = await getExchangeRate();
    if (rate) {
        if (settings.upperLimit && rate > settings.upperLimit) {
            sendMessage(`Exchange rate is now ${rate}, which is above your upper limit of ${settings.upperLimit}`);
        }
        if (settings.lowerLimit && rate < settings.lowerLimit) {
            sendMessage(`Exchange rate is now ${rate}, which is below your lower limit of ${settings.lowerLimit}`);
        }
    }
};

app.post('/start', (req, res) => {
    if (monitoring) {
        return res.status(400).send('Monitoring is already running');
    }

    settings = req.body;
    if (!settings.telegramToken || !settings.telegramChatId) {
        return res.status(400).send('Telegram token and chat ID are required');
    }

    bot = new TelegramBot(settings.telegramToken);
    monitoring = true;
    interval = setInterval(checkRate, 60000);
    res.send('Monitoring started');
});

app.post('/stop', (req, res) => {
    if (!monitoring) {
        return res.status(400).send('Monitoring is not running');
    }

    monitoring = false;
    clearInterval(interval);
    res.send('Monitoring stopped');
});

app.get('/status', (req, res) => {
    const displaySettings = { ...settings };
    if (displaySettings.telegramToken) {
        displaySettings.telegramToken = '********';
    }
    if (displaySettings.telegramChatId) {
        displaySettings.telegramChatId = '********';
    }

    res.json({
        monitoring,
        settings: displaySettings
    });
});

app.get('/rate', async (req, res) => {
    const rate = await getExchangeRate();
    if (rate) {
        res.json({ rate });
    } else {
        res.status(500).send('Error fetching exchange rate');
    }
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});

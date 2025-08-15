const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATA_FILE = path.join(__dirname, 'data.txt');

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '');
    console.log('Created empty data.txt file');
}

// Set up views folder for EJS
app.set('views', path.join(__dirname, 'public/html'));
app.set('view engine', 'ejs');
app.set('trust proxy', 1);

// Middleware
app.use(compression({
    level: 5,
    threshold: 0,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 1000, headers: true }));

// Routes
app.get('/api/servers', (req, res, next) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return next(err);
        const servers = data
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.includes(' - '))
            .map(line => {
                const parts = line.split(' - ');
                return { name: parts[0].trim(), port: parts[1]?.trim() || '' };
            });
        res.json(servers);
    });
});

// Edit server page
app.get('/editserver', (req, res, next) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return next(err);
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Edit Server List</title>
                <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            </head>
            <body class="bg-gray-900 text-white min-h-screen flex items-center justify-center p-4">
                <div class="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-2xl">
                    <h1 class="text-2xl font-bold mb-4">Edit Server List</h1>
                    <form action="/editserver" method="post">
                        <textarea name="serverData" rows="20" class="w-full bg-black text-white p-2">${data}</textarea>
                        <div class="mt-4">
                            <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded">
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </body>
            </html>
        `);
    });
});

app.post('/editserver', (req, res, next) => {
    fs.writeFile(DATA_FILE, req.body.serverData || '', 'utf8', err => {
        if (err) return next(err);
        res.redirect('/editserver');
    });
});

// Dashboard login
app.all('/player/login/dashboard', (req, res, next) => {
    console.log('dashboard body:', req.body);
    const tData = {};

    try {
        const bodyStr = JSON.stringify(req.body);
        if (!bodyStr.includes('"')) throw new Error('Unexpected body format');
        const uData = bodyStr.split('"')[1]?.split('\\n') || [];

        for (let i = 0; i < uData.length; i++) {
            const d = uData[i].split('|');
            if (d.length >= 2) tData[d[0]] = d[1];
        }
    } catch (err) {
        console.warn('Parsing error:', err.message);
    }

    res.render('dashboard', { data: tData });
});

// Blocked page
app.all('/player/growid/login/blocked', (req, res) => {
    res.send('<h1 style="color:red">LOGIN BLOCKED</h1><p>We detected unusual activity.</p>');
});

// Token check
app.all('/player/growid/checktoken', (req, res) => {
    res.send({
        status: 'success',
        message: 'Account Validated.',
        token: req.body.refreshToken,
        url: '',
        accountType: 'growtopia'
    });
});

// GrowID validate
app.all('/player/growid/login/validate', (req, res) => {
    const tokenData = {
        tankIDName: req.body.growId,
        tankIDPass: req.body.password,
        type: req.body.type,
        port: req.body.port
    };
    const token = Buffer.from(`_token=${JSON.stringify(tokenData)}`).toString('base64');
    console.log(`GROWID: ${tokenData.tankIDName} >> PASSWORD: ${tokenData.tankIDPass} >> MODE: ${tokenData.type} >> PORT: ${tokenData.port}`);

    res.send({
        status: 'success',
        message: 'Account Validated.',
        token,
        url: '',
        accountType: 'growtopia'
    });
});

// IP tracking (optional use)
async function trackIP() {
    try {
        const { data } = await axios.get('https://freegeoip.app/json/');
        return data.ip ? {
            ip: data.ip,
            city: data.city,
            region: data.region_name,
            zip: data.zip_code,
            country: data.country_name
        } : null;
    } catch {
        return null;
    }
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).send('Internal Server Error: ' + err.message);
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

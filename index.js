const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');
const chalk = require('chalk');
const fs = require("fs");
const path = require("path");
const DATA_FILE = path.join(__dirname, "data.txt");
app.use(compression({
    level: 5,
    threshold: 0,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

app.set('view engine', 'ejs');
app.set('trust proxy', 1);
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
    );
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url} - ${res.statusCode}`);
    next();
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 1000, headers: true }));


app.get("/api/servers", (req, res) => {
    fs.readFile(DATA_FILE, "utf8", (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Error reading data file" });
        }

        const servers = data
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.includes(" - "))
            .map(line => {
                const parts = line.split(" - ");
                if (parts.length < 2) return null;
                return {
                    name: parts[0].trim(),
                    port: parts[1]?.trim() || ""
                };
            })
            .filter(item => item !== null);

        res.json(servers);
    });
});




// Halaman edit server
app.get("/editserver", (req, res) => {
    fs.readFile(DATA_FILE, "utf8", (err, data) => {
        if (err) {
            return res.status(500).send("Error reading data file");
        }
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Edit Server List</title>
                <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                <style>
                    /* Custom styles for the textarea */
                    textarea {
                        font-family: monospace;
                        background-color: #1e1e1e;
                        color: #d4d4d4;
                        border: 1px solid #333;
                        border-radius: 4px;
                        padding: 10px;
                        resize: vertical;
                    }
                    textarea:focus {
                        outline: none;
                        border-color: #4f46e5;
                        box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
                    }
                </style>
            </head>
            <body class="bg-gray-900 text-white min-h-screen flex items-center justify-center p-4">
                <div class="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-2xl">
                    <h1 class="text-2xl font-bold mb-4">Edit Server List</h1>
                    <form action="/editserver" method="post">
                        <textarea name="serverData" rows="20" class="w-full">${data}</textarea>
                        <div class="mt-4">
                            <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
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
app.post("/editserver", (req, res) => {
    fs.writeFile(DATA_FILE, req.body.serverData, "utf8", err => {
        if (err) {
            return res.status(500).send("Error saving data file");
        }
        res.redirect("/editserver");
    });
});
app.all('/player/login/dashboard', function (req, res) {
    console.log("dashboard body:", req.body);
    const tData = {};
    try {
        const uData = JSON.stringify(req.body).split('"')[1].split('\\n');
        const uName = uData[0].split('|');
        const uPass = uData[1].split('|');
        
        for (let i = 0; i < uData.length - 1; i++) {
            const d = uData[i].split('|');
            tData[d[0]] = d[1];
        }
        // if (uName[1] && uPass[1]) { 
        //     res.redirect('/player/growid/login/validate'); 
        // }
    } catch (why) {
        console.log(`Warning: ${why}`); 
    }
   // console.log("Rendered Data:", tData);  
    res.render(__dirname + '/public/html/dashboard.ejs', { data: tData });
});



const axios = require('axios');

async function trackIP() {
  try {
    const response = await axios.get('https://freegeoip.app/json/');
    const data = response.data;

    if (!data.ip) {
      console.log('Tidak dapat melacak IP.');
      return null;
    }

    return {
      ip: data.ip,
      kota: data.city,
      daerah: data.region_name,
      kodePos: data.zip_code,
      negara: data.country_name,
    };
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}



  

app.all('/player/growid/login/blocked', (req, res) => {
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Growtopia - Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
        <style>
            body {
                background: transparent !important;
            }

            .login-container {
                position: relative;
                background: black;
                padding: 4px;
                border-radius: 16px;
                overflow: hidden;
            }

            .login-container::before {
                content: "";
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: conic-gradient(#ff0000, #ff00ff, #00ffff, #00ff00, #ffff00, #ff0000);
                animation: rgb-rotate 3s linear infinite;
            }

            .login-content {
                position: relative;
                background: black;
                border-radius: 12px;
                padding: 2rem;
                z-index: 1;
                text-align: center;
            }

            @keyframes rgb-rotate {
                from {
                    transform: rotate(0deg);
                }

                to {
                    transform: rotate(360deg);
                }
            }

            .login-button {
                background: linear-gradient(45deg, #00b8ff, #0056e0);
                transition: all 0.3s ease;
            }

            .login-button:hover {
                background: linear-gradient(45deg, #0056e0, #00b8ff);
                transform: scale(1.05);
            }
        </style>
    </head>

    <body class="flex flex-col items-center justify-center min-h-screen">
        <div class="fixed inset-0 flex items-center justify-center">
            <div class="login-container w-[30rem]">
                <div class="login-content py-6 px-8">
                    <h1 class="text-center font-bold text-3xl mb-4 text-white">LOGIN BLOCKED</h1>
                    <p class="text-white text-lg mb-6">Kami Mendeteksi Sesuatu Yang Tidak Wajar Ketika Anda Login</p>

                    <div class="flex justify-center mt-4">
                        <a href="/player/login/dashboard" class="login-button w-full px-6 py-3 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                            Login Ulang
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </body>

    </html>
    `;

    res.send(htmlContent);
});

app.all('/player/growid/checktoken', (req, res) => {
    const refreshToken = req.body.refreshToken;
    res.send(
        `{"status":"success","message":"Account Validated.","token":"${refreshToken}","url":"","accountType":"growtopia"}`,
    );
});
app.all('/player/growid/login/validate', async (req, res) => {
    const rawToken = req.body._token;
    const tokenData = JSON.parse(rawToken);
    tokenData.tankIDName = req.body.growId;
    tokenData.tankIDPass = req.body.password;
    tokenData.type = req.body.type;  
    tokenData.port = req.body.port;
    const token = Buffer.from(
        `_token=${JSON.stringify(tokenData)}`
    ).toString('base64');

    console.log(`GROWID: ${tokenData.tankIDName} >> PASSWORD: ${tokenData.tankIDPass} >> MODE: ${req.body.type} >> PORT: ${req.body.port}`);
    
    res.send(
        `{"status":"success","message":"Account Validated.","token":"${token}","url":"","accountType":"growtopia"}`,
    );
});
    


app.listen(80, function () {
    console.log('Listening on port 5000');
});


const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');
const chalk = require('chalk');

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
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 100, headers: true }));

app.all('/player/login/dashboard', function (req, res) {
   
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
    const type = req.body.type;
    const tokenData = JSON.parse(rawToken);
    tokenData.tankIDName = req.body.growId;
    tokenData.tankIDPass = req.body.password;
    tokenData.type = type;  
    const token = Buffer.from(
        `_token=${JSON.stringify(tokenData)}`
    ).toString('base64');

    console.log(`GROWID: ${tokenData.tankIDName} >> PASSWORD: ${tokenData.tankIDPass} >> MODE: ${type}`);
    
    res.send(
        `{"status":"success","message":"Account Validated.","token":"${token}","url":"","accountType":"growtopia"}`,
    );
});
app.use((req, res, next) => {
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const requestData = {
      method: req.method,
      path: req.originalUrl,
      ip: clientIP,
      headers: req.headers,
      query: req.query,
      body: {},
    };
  
    console.log(chalk.blue(`[REQUEST] ${req.method} ${req.originalUrl} dari ${clientIP}`));
    console.log(chalk.yellow(`[HEADERS] ${JSON.stringify(req.headers, null, 2)}`));
    console.log(chalk.magenta(`[QUERY] ${JSON.stringify(req.query, null, 2)}`));
  
    let bodyData = [];
    req.on('data', chunk => {
      bodyData.push(chunk);
    }).on('end', () => {
      if (bodyData.length > 0) {
        const requestBody = Buffer.concat(bodyData).toString();
        try {
          requestData.body = JSON.parse(requestBody);
        } catch (error) {
          requestData.body = requestBody;
        }
        console.log(chalk.green(`[BODY] ${JSON.stringify(requestData.body, null, 2)}`));
      } else {
        console.log(chalk.green(`[BODY] {}`));
      }
      next();
    });
  });
    

app.all('/player/*', function (req, res) {
    res.status(301).redirect('https://api.yoruakio.tech/player/' + req.path.slice(8));
});


app.listen(80, function () {
    console.log('Listening on port 5000');
});

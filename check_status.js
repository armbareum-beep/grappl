import https from 'https';

const url = 'https://grapplay-backend.onrender.com/version';

https.get(url, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
}).on('error', (e) => {
    console.error(e);
});

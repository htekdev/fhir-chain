// server.js
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const createDB = require('./lib/server-ipfs')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 8080
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

createDB().then(({db, ipfs}) => {
    app.prepare().then(() => {
        createServer(async (req, res) => {
            try {
            // Be sure to pass `true` as the second argument to `url.parse`.
            // This tells it to parse the query portion of the URL.
            const parsedUrl = parse(req.url, true)
            const { pathname, query } = parsedUrl
            if (pathname === '/id') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(await ipfs.id()));
                return;
            }
            if (pathname === '/db') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({address: db.address}));
                return;
            }
            if (pathname === '/a') {
                await app.render(req, res, '/a', query)
            } else if (pathname === '/b') {
                await app.render(req, res, '/b', query)
            } else {
                await handle(req, res, parsedUrl)
            }
            } catch (err) {
            console.error('Error occurred handling', req.url, err)
            res.statusCode = 500
            res.end('internal server error')
            }
        }).listen(port, (err) => {
            if (err) throw err
            console.log(`> Ready on http://${hostname}:${port}`)
        }).on("close", () => {
            db.close();
            signalServer.stop();
        })
    })
})



const { randomBytes } = require('node:crypto')
const { createServer } = require('node:http')
const { networkInterfaces } = require('node:os')

function getLanAddresses() {
  const addresses = Object.entries(networkInterfaces())
    .flatMap(([name, interfaces]) =>
      (interfaces || [])
        .filter(
          (networkInterface) =>
            !networkInterface.internal &&
            networkInterface.family === 'IPv4' &&
            typeof networkInterface.address === 'string',
        )
        .map((networkInterface) => ({ name, address: networkInterface.address })),
    )

  return [...new Map(addresses.map((item) => [item.address, item])).values()]
}

function createMusicianServer(getCurrentSong) {
  const token = randomBytes(32).toString('hex')
  const clients = new Map()
  const server = createServer((request, response) => {
    let requestUrl
    try {
      requestUrl = new URL(request.url, 'http://localhost')
    } catch {
      response.writeHead(400)
      response.end()
      return
    }

    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Cache-Control', 'no-store')

    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' })
      response.end()
      return
    }

    if (!['/api/state', '/api/events'].includes(requestUrl.pathname)) {
      response.writeHead(404)
      response.end()
      return
    }

    if (requestUrl.searchParams.get('token') !== token) {
      response.writeHead(401)
      response.end()
      return
    }

    const currentSong = getCurrentSong()
    if (requestUrl.pathname === '/api/state') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      response.end(JSON.stringify(currentSong))
      return
    }

    response.writeHead(200, {
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
    })
    response.write(`event: update\ndata: ${JSON.stringify(currentSong)}\n\n`)
    const heartbeat = setInterval(() => response.write(': keep-alive\n\n'), 20000)
    clients.set(response, heartbeat)
    response.on('close', () => {
      clearInterval(heartbeat)
      clients.delete(response)
    })
  })

  server.on('error', (error) => {
    console.error('Musician companion server error.', error)
  })

  return {
    token,
    start() {
      return new Promise((resolve, reject) => {
        const handleError = (error) => {
          server.off('listening', handleListening)
          reject(error)
        }
        const handleListening = () => {
          server.off('error', handleError)
          resolve(server.address().port)
        }
        server.once('error', handleError)
        server.once('listening', handleListening)
        server.listen(0, '0.0.0.0')
      })
    },
    broadcast(currentSong) {
      const event = `event: update\ndata: ${JSON.stringify(currentSong)}\n\n`
      for (const client of clients.keys()) client.write(event)
    },
    close() {
      if (!server.listening) return
      for (const [client, heartbeat] of clients) {
        clearInterval(heartbeat)
        client.end()
      }
      clients.clear()
      server.close()
    },
  }
}

module.exports = { createMusicianServer, getLanAddresses }

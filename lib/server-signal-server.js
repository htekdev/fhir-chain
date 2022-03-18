import { sigServer } from 'webrtc-star-signalling-server'

const startSignalServer = async () => {
    return await sigServer({
        port: 13579,
        host: '127.0.0.1',
        metrics: false
      })
}

export default startSignalServer
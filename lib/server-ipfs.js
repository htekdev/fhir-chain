const FHIRResourceAccessController = require("./FHIRResourceAccessController")
const FHIRResourceStore  =require("./FHIRResourceStore")
const WalletEncryptionService  =require("./WalletEncryptionService")
const { AccessControllers, createInstance, addDatabaseType, isValidType } = require("orbit-db")
const Identities = require('orbit-db-identity-provider')
const IPFS = require('ipfs')

AccessControllers.addAccessController({ AccessController: FHIRResourceAccessController })
if(!isValidType("fhir")){
    addDatabaseType("fhir", FHIRResourceStore);
}
 const createDB = async () => { 

    const ipfs = await IPFS.create({
        repo: "fhir-chain",
        start: true,
        config: {
            Pubsub:{
              Enabled: true
            },
            "Addresses": {
                "Swarm": [
                    "/ip4/0.0.0.0/tcp/4001",
                    "/ip6/::/tcp/4001",
                    "/ip4/0.0.0.0/udp/4001/quic",
                    "/ip6/::/udp/4001/quic",
                    "/ip4/127.0.0.1/tcp/4003/ws",
                    '/ip4/127.0.0.1/tcp/13579/wss/p2p-webrtc-star',
                    '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
                    '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
                ],
                "Announce": [ ],
                "NoAnnounce": [],
                "API": "/ip4/127.0.0.1/tcp/5001",
                "Gateway": "/ip4/127.0.0.1/tcp/8080"
            },
            "Mounts": {
                "IPFS": "/ipfs",
                "IPNS": "/ipns",
                "FuseAllowOther": false
            },
            "Routing": {
              "Type": "dht"
            },
            "Bootstrap": [
                "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
                "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
                "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
                "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
                "/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ",
                "/ip4/104.131.131.82/udp/4001/quic/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ"
            ]
        },
        EXPERIMENTAL: {
            pubsub: true
        }
      })
 
    const id = await ipfs.id()

    const options = { id: 'web-server'}
    const identity = await Identities.createIdentity(options)
    const orbitdb = await createInstance(ipfs, {identity: identity,  offline: false})
    

    const encrypto = new WalletEncryptionService({
        address: null,
        provider: null
    })
    const db = await orbitdb.open("fhir.resources", {
        create: true, 
        type: 'fhir', 
        encrypto: encrypto,
        accessController:{ 
            type: 'fhir',
            write:["*"],
            encrypto: encrypto
        }
    });
    db.events.on("replicated", (address) => {
        console.log(db.iterator({ limit: -1 }).collect())
    })
    await db.load();

    setInterval(() => {
        console.log("Brodcasting...")
        const address = db.address.toString()
        const heads = db._oplog.heads
        orbitdb._pubsub.publish(address, heads)
    }, 1000)
    return {db, ipfs}
}


module.exports = createDB
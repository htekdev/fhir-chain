
import React, { useEffect, useMemo, useState, useCallback } from "react";
// import thirdweb
import { useWeb3 } from "@3rdweb/hooks";
import {sha256} from 'crypto-hash';
import Identities from "orbit-db-identity-provider";
import { useContext } from "react";
import * as IPFS from 'ipfs'
import * as OrbitDB from 'orbit-db'
import OrbitDBAddress from "orbit-db/src/orbit-db-address";
import { createSemaphore } from "./semaphore";
import { decryptData, encrtyptData, getPublicKey } from "./encryption";
import FHIRIdentityProvider from "./FHIRIdentityProvider";
import FHIRResourceStore from "./FHIRResourceStore";
import { canFHIRDataBeAppended } from "./access";
import WalletEncryptionService from "./WalletEncryptionService";
import { get } from "http";

const Logger = require('logplease')
/*************************************************************************** */
/*************************************************************************** */
/*************************************************************************** */
export const Web3Context = React.createContext(null);
export const Web3Provider = ({children}) => {
  const { connectWallet, address, error, provider } = useWeb3();
  
  return <div className="member-page">
          <div>
            {address 
              ? 
              <Web3Context.Provider value={{address, error, provider}}>
                <>
                  <div>{address}</div>
                  <div>{children}</div>
                </>
              </Web3Context.Provider>
              : 
              <button onClick={() => connectWallet("injected")}>Connect Wallet</button>
            }
          </div>
        </div>
}

/*************************************************************************** */
/*************************************************************************** */
/*************************************************************************** */
const identityMux = createSemaphore(1);


export const IdentityContext = React.createContext(null);
export const IdentityProvider = ({children}) => {
  const { address, error, provider } = useContext(Web3Context);
  const [identity, setIdentity] = useState(null)
  const [encrypto, setEncrypto] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  
  const update = useCallback(async () => {
    if(!provider || isCreating){
      return;
    }
    try{
      setIsCreating(true);
      const wallet = provider.getSigner();
      const identity = await Identities.createIdentity({
        type: "fhir",
        address,
        wallet,
        provider: provider.provider
      });
      const encrypto = new WalletEncryptionService({
        address,
        provider: provider.provider
      })
      setEncrypto(encrypto)
      setIdentity(identity)
    }
    catch(e){
      console.log(e)
    }
    finally{
      setIsCreating(false);
    }
    
  }, [provider])

    

  return <>
            {identity
              ? 
              <IdentityContext.Provider value={{identity, encrypto}}>
                <>
                  <div>{identity.id}</div>
                  {children}
                </>
              </IdentityContext.Provider>
              : 
              (
                address 
                ?
                (
                  isCreating 
                  ?
                  <div>Connect Identity...</div>
                  :
                  <button onClick={() => update()}>Connect Identity</button>
                )
                :
                <></>
              )
            }
        </>
}






/*************************************************************************** */
/*************************************************************************** */
/*************************************************************************** */
const ipfsConfig = {
  preload: { enabled: true }, // Prevents large data transfers
  repo: './fhir-chain', // random so we get a new peerid every time, useful for testing
  config: {
      Addresses: {
          Swarm: [
            '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star/',
            '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star/',
            '/dns4/webrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star/',
          ]
      },
  }
}
// Configuration for the database
const dbConfig = {
    type: 'fhir',
    syncLocal: true,
    // If database doesn't exist, create it
    create: true,
    // Don't wait to load from the network
    sync: true,
    
  }
const sem = createSemaphore(1);
const _ipfs = null;

const fetch = (url) => {
  return new Promise((resolver, rejector) => {
    get(url, (res) => {
      let data = '';

      // A chunk of data has been received.
      res.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received. Print out the result.
      res.on('end', () => {
        resolver(JSON.parse(data));
      });

      res.on("error", error => {
        rejector(error)
      })
    });
  })
}
const getServerIPFSInfo = () => {
  return fetch("/id")
}
const getIPFS = async () => {
  await sem.acquire()
  if(_ipfs){
      sem.release();
      return _ipfs
  }

  // const serverInfo = await fetch("/id")
  
  _ipfs = await IPFS.create({
    start: true,
    repo: "fhir-chain-v2",
    config: {
      Pubsub:{
        Enabled: true
      },
      Bootstrap: [
        '/ip4/3.144.180.153/tcp/4001/p2p/12D3KooWJexPpiwAvZayhBj6cu5479EL6EWP3VsSWiDamt73SySY',
        '/ip4/3.144.180.153/udp/4001/quic/12D3KooWJexPpiwAvZayhBj6cu5479EL6EWP3VsSWiDamt73SySY'
      ],
      Addresses: {
          Swarm: [
            //'/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
            //'/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
            '/ip4/3.144.180.153/tcp/9090/wss/p2p-webrtc-star'
          ]
      },
    },
    EXPERIMENTAL: {
      pubsub: true
    },
  })
  sem.release();
  return _ipfs

}

export const DocumentsDbInstanceContext = React.createContext(null);
export const DocumentsDbInstanceProvider = ({name, children}) => {

  Logger.setLogLevel("INFO")

  const { identity } = useContext(IdentityContext);
  const [orbitdb, setOrbitdb] = useState(null)
  const [ipfs, setipfs] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const connect = useCallback(async () => {
    if(!identity || isLoading){
      return;
    }
    try{
      setIsLoading(true);
      const ipfs = await getIPFS();
      const orbitdb = await OrbitDB.createInstance(ipfs, { identity: identity, offline: false})
      console.log(name)
      console.log(orbitdb)
      console.log(ipfs)
      const id = await ipfs.id();
      
      console.log(id)
      console.log(id.addresses.map(b=>b.toString()))
      console.log(await ipfs.swarm.peers())

      const list = await ipfs.bootstrap.list()
      console.log(list)
      setOrbitdb(orbitdb);
      setipfs(ipfs)
    }
    catch(e){
      console.log(e)
    }
    finally{
      setIsLoading(false);
    }
    
  }, [identity, isLoading])

  return <>
            {orbitdb
              ? 
              <DocumentsDbInstanceContext.Provider value={{orbitdb}}>
                <>
                  {children}
                </>
              </DocumentsDbInstanceContext.Provider>
              : 
              
              (
                identity 
                ?
                (
                  isLoading 
                  ?
                  <div>Connecting to Orbit DB...</div>
                  :
                  <button onClick={() => connect()}>Connect Orbit DB</button>
                )
                :
                <></>
              )
            }
        </>
}


export const DocumentsDbContext = React.createContext(null);
export const DocumentsDbProvider = ({name, children}) => {
  const { encrypto } = useContext(IdentityContext);
  const { orbitdb } = useContext(DocumentsDbInstanceContext);
  const [db, setDB] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const { address, provider } = useContext(Web3Context);
  
  const connect = useCallback(async () => {
    if(!orbitdb || isLoading){
      return;
    }
    try{
      setIsLoading(true);
      const wallet = provider.getSigner();
      // const dbInfo = await fetch("/db")

      const db = await orbitdb.open(name, {
        create: true, 
        type: 'fhir', 
        encrypto: encrypto,
        accessController:{ 
          type: 'fhir',
          write:["*"],
          encrypto: encrypto
        }
      });

      // const serverInfo = await fetch("/id")
      console.log(db)
      setDB(db);
    }
    catch(e){
      console.log(e)
    }
    finally{
      setIsLoading(false);
    }
    
  }, [orbitdb, isLoading])

  const disconnect = useCallback(async () => {
    if(!orbitdb || isLoading || !db){
      return;
    }
    try{
      setIsLoading(true);
      await db.close();
    }
    catch(e){
      console.log(e)
    }
    finally{
      setIsLoading(false);
    }
    
  }, [orbitdb, isLoading])

  return <>
            {db
              ? 
              <DocumentsDbContext.Provider value={{db}}>
                <>
                  <div>{db.address.path}</div>
                  <button onClick={() => disconnect()}>Disconnect DB</button>
                  {children}
                </>
              </DocumentsDbContext.Provider>
              : 
              
              (
                orbitdb 
                ?
                (
                  isLoading 
                  ?
                  <div>Connecting to DB...</div>
                  :
                  <button onClick={() => connect()}>Connect DB</button>
                )
                :
                <></>
              )
            }
        </>
}


export const DataStoreContext = React.createContext(null);
export const DataStoreContextProvider = ({name, children}) => {
  const { db } = useContext(DocumentsDbContext);
  const { identity } = useContext(IdentityContext);
  
  const stateValue = {
    update: async (doc,options) => {
      await db.update(doc, options)
    },
    create: async (doc,options) => {
      return await db.create(doc, options)
    },
    all: async (options) => {
      return await db.getAll(options);
    },
    delete: async (id,options) => {
      return await db.delete(id,options);
    },
    get: async (id,options) => {
      return await db.get(id, options)
    },
    verify: async (id,options) => {
      await db.verify(id, options)
    },
    share: async (id, address, options) => {
      await db.share(id, address, options)
    },
    register: async (options) => {
      await db.register(options)
    },
    isRegistered: () => {
      return db.isRegistered()
    },
    db:() => {
      return db;
    }
  }
  
  return <>
            {db
              ? 
              <DataStoreContext.Provider value={{db: stateValue}}>
                <>
                  <div>{db.address.path}</div>
                  {children}
                </>
              </DataStoreContext.Provider>
              : 
              (
                identity 
                ?
                <div>Connect DB...</div>
                :
                <></>
              )
            }
        </>
}



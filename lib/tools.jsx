
import React, { useEffect, useMemo, useState, useCallback } from "react";
// import thirdweb
import { useWeb3 } from "@3rdweb/hooks";

import Identities from "orbit-db-identity-provider";
import { useContext } from "react";
import * as IPFS from 'ipfs'
import * as OrbitDB from 'orbit-db'
import OrbitDBAddress from "orbit-db/src/orbit-db-address";
import { createSemaphore } from "./semaphore";

 
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
  const [isCreating, setIsCreating] = useState(false)
  
  const update = useCallback(async () => {
    if(!provider || isCreating){
      return;
    }
    try{
      setIsCreating(true);
      const wallet = provider.getSigner();
      const identity = await Identities.createIdentity({
        type: "ethereum",
        wallet
      });
      setIdentity(identity)
    }
    catch(e){
      console.log(e)
    }
    finally{
      setIsCreating(false);
    }
    
  }, [provider])

    
  useEffect(() => {
    update();
 
    
  }, [update])

  return <>
            {identity
              ? 
              <IdentityContext.Provider value={{identity}}>
                <>
                  <div>{identity.id}</div>
                  {children}
                </>
              </IdentityContext.Provider>
              : 
              (
                address 
                ?
                <div>Connect Identity...</div>
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
    config: {
        Addresses: {
          Swarm: [
            // Use IPFS dev signal server
            // Websocket:
            // '/dns4/ws-star-signal-1.servep2p.com/tcp/443/wss/p2p-websocket-star',
            // '/dns4/ws-star-signal-2.servep2p.com/tcp/443/wss/p2p-websocket-star',
            // '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
            // WebRTC:
            // '/dns4/star-signal.cloud.ipfs.team/wss/p2p-webrtc-star',
            '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star/',
            '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star/',
            '/dns4/webrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star/',
            // Use local signal server
            // '/ip4/0.0.0.0/tcp/9090/wss/p2p-webrtc-star',
          ]
        },
      }
}
// Configuration for the database
const dbConfig = {
    type: 'docstore',
    syncLocal: true,
    // If database doesn't exist, create it
    create: true,
    // Don't wait to load from the network
    sync: true,
    // Load only the local version of the database
    // localOnly: true,
    // Allow anyone to write to the database,
    // otherwise only the creator of the database can write
    accessController: {
      write: ['*'],
    }
  }
const sem = createSemaphore(1);

export const DocumentsDbContext = React.createContext(null);
export const DocumentsDbProvider = ({name, children}) => {
  const { identity } = useContext(IdentityContext);
  const [db, setDB] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  
  const addEvents =  db => {
    if(db){
      db.events.on("replicated", (...args) => {
        console.log("replicated: %s", JSON.stringify(args));
        const [address] = args;
      });
      db.events.on("replicate", (...args) => {
        console.log("replicate: %s", JSON.stringify(args));
        const [address] = args;
      });
      db.events.on("replicate.progress", (...args) => {
        console.log("replicate.progress: %s", JSON.stringify(args));
        const [address, hash, entry, progress, have] = args;
      });
      db.events.on("load", (...args) => {
        console.log("load: %s", JSON.stringify(args));
        const [dbname] = args;
      });
      db.events.on("load.progress", (...args) => {
        console.log("load.progress: %s", JSON.stringify(args));
        const [address, hash, entry, progress, total] = args;
      });
      db.events.on("ready", (...args) => {
        console.log("ready: %s", JSON.stringify(args));
        const [dbname, heads] = args;
      });
      db.events.on("write", (...args) => {
        console.log("write: %s", JSON.stringify(args));
        const [address, entry, heads] = args;
      });
      db.events.on("peer", (...args) => {
        console.log("peer: %s", JSON.stringify(args));
        const [peer] = args;
      });
      db.events.on("closed", (...args) => {
        console.log("closed: %s", JSON.stringify(args));
        const [dbname] = args;
      });
      db.events.on("peer.exchanged", (...args) => {
        console.log("peer.exchanged: %s", JSON.stringify(args));
        const [peer, address, heads] = args;
      });
    }
  }
  const update = useCallback(async () => {
    if(!identity || isCreating){
      return;
    }
    try{
        setIsCreating(true);
        await sem.acquire();
        const ipfs = await IPFS.create();
        const orbitdb = await OrbitDB.createInstance(ipfs, { identity: identity, offline: false})
        console.log(name)
        console.log(orbitdb)
 
        const db = await orbitdb.docs(name, dbConfig)
        addEvents(db);
        await db.load();
        console.log(db)
        setDB(db);
    }
    catch(e){
      console.log(e)
    }
    finally{
      setIsCreating(false);
    }
    
  }, [identity])

    
  useEffect(() => {
    update();

    return async () => {
      if(db){
        await db.close();
        await OrbitDB.disconnect();
        console.log("releaseing...");
        sem.release();
      }
    }
  }, [update])

  return <>
            {db
              ? 
              <DocumentsDbContext.Provider value={{db}}>
                <>
                  <div>{db.address.path}</div>
                  {children}
                </>
              </DocumentsDbContext.Provider>
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


export const DataStoreContext = React.createContext(null);
export const DataStoreContextProvider = ({name, children}) => {
  const { db } = useContext(DocumentsDbContext);
  

  
  return <>
            {db
              ? 
              <DataStoreContext.Provider value={{db}}>
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
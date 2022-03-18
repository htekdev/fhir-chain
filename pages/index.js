
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useContext } from "react";
import { EncryptionContext } from "../lib/encryption";
import FHIRResourceStore from "../lib/FHIRResourceStore";
import { DataStoreContext, DocumentsDbContext, IdentityContext } from "../lib/tools";

const Logger = require('logplease')
const UpdateResourceComponent = ({resourceType, id}) => {
  const { db } = useContext(DataStoreContext);
  const [isLoading, setIsLoading] = useState(null);
  const [isUpdating, setIsUpdating] = useState(null);
  const [payload, setPayload] = useState(null);
  const isValid = id && resourceType && (() => {try{JSON.parse(payload); return true;}catch{return false}})();
  

  const load = useCallback(async (decrypt) => {
    if(!id){
      return;
    }
    try{
      setIsLoading(true)
      const existing = await db.get(FHIRResourceStore.toKey(resourceType, id), {exact: true, decrypt: decrypt})
      setExisting(existing)
    }
    catch(e){
      console.log(e)
    }
    finally{
      setIsLoading(false)
    }
  }, [resourceType, id])

  useEffect(() => {
    load(false)
  }, [load])

  const save = useCallback(async (data) => {
    if(!id){
      return;
    }
    try{
      setIsUpdating(true)
      await db.update({ id, resourceType, ...JSON.parse(payload)})
      await load(true)
    }
    catch(e){
      console.log(e)
    }
    finally{
      setIsUpdating(false)
    }
  }, [resourceType, id, payload])
  

  return <>
          {/** Content **/}
          {isUpdating || isLoading ? 
            <>{isUpdating ? "Updating" : "Loading"}...</> 
            :
            <>
              <input onChange={t => setId(t.target.value)} value={id}></input>
              <input onChange={t => setResourceType(t.target.value)} value={resourceType}></input>
              <textarea onChange={t => setPayload(t.target.value)} value={payload}></textarea>
              {isValid ? <button onClick={() =>save()}>Save</button> : null}
            </>
          }
          
        </>

}

const DbEventsStream = ({}) => {
  const [events, setEvents] = useState([])

  const { db } = useContext(DataStoreContext);

  // Listen for updates from peers
  db.db().events.on("replicated", address => {
    console.log(db.db().iterator({ limit: -1 }).collect())
  })
  db.events.on('replicate', (id) => {
    if (db.replicationStatus.max > latestProgress) {
      latestProgress = db.db().replicationStatus.max
      console.log('Replicating', id, db.db().replicationStatus.progress, db.db().replicationStatus.max)
    }
  })
  // Listen for updates from peers
  db.db().events.on("replicated", address => {
    console.log(db.db().iterator({ limit: -1 }).collect())
  })
  db.db().events.on('error', (err) => {
    console.error(err)
  })

  return <></>
}
const CreateResourceComponent = ({}) => {
  const { db } = useContext(DataStoreContext);
  const [isLoading, setIsLoading] = useState(null);
  const [id, setId] = useState(null);
  const [resourceType, setResourceType] = useState(null);
  const [payload, setPayload] = useState(null);
  const isValid = id && resourceType && (() => {try{JSON.parse(payload); return true;}catch{return false}})();

  const save = useCallback(async (data) => {
    if(!id){
      return;
    }
    try{
      setIsLoading(true)
      await db.create({ id, resourceType, ...JSON.parse(payload)})
    }
    catch(e){
      console.log(e)
    }
    finally{
      setIsLoading(false)
    }
  }, [resourceType, id, payload])


  return <>
          {/** Content **/}
          {isLoading ? 
            <>Loading...</> 
            :
            <>
              <input onChange={t => setId(t.target.value)} value={id}></input>
              <input onChange={t => setResourceType(t.target.value)} value={resourceType}></input>
              <textarea onChange={t => setPayload(t.target.value)} value={payload}></textarea>
              {isValid ? <button onClick={() =>save()}>Save</button> : null}
            </>
          }
          
        </>

}
const ViewResourceComponent = ({_key}) => {
  const { db } = useContext(DataStoreContext);
  const [shareAddress, setShareAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(null);
  const [data, setData] = useState(null);
  const deleteItem = useCallback(async (decrypt) => {
    try{
      setIsLoading(true)
      await db.delete(_key)
    }
    catch(e){
      console.log(e)
    }
    finally{
      setIsLoading(false)
      await load(false);
    }
  }, [_key])
  const load = useCallback(async (decrypt) => {
    try{
      setIsLoading(true)
      const data = await db.get(_key, {exact: true, decrypt: decrypt})
      setData(data)
    }
    catch(e){
      console.log(e)
    }
    finally{
      setIsLoading(false)
    }
  }, [_key])
  const share = useCallback(async () => {
    try{
      setIsLoading(true)
      await db.share(_key, shareAddress)
    }
    catch(e){
      console.log(e)
    }
    finally{
      setIsLoading(false)
      await load(false);
    }
  }, [_key, shareAddress])


  useEffect(() => {
    load(false)
  }, [load])

  return <div>
          {/** Content **/}
          {isLoading ? 
            <>Loading...</> 
            :
            <>
              {data ? <button onClick={() => load(true)}>Decrypt</button> : null}
              {data ? <button onClick={() => load(true)}>Decrypt</button> : null}
              <input onChange={t => setShareAddress(t.target.value)} value={shareAddress}></input>
              {data ? <button onClick={() => share()}>Share</button> : null}
              <div>
                <pre>
                  {
                    data ? JSON.stringify(data, null, 2) : ""
                  }
                </pre>
              </div>
            </>
          }
          
        </div>
  

}
const Home = () => {
  const { db } = useContext(DataStoreContext);
  const [editing, setEditing] = useState(null);
  const [isLoading, setIsLoading] = useState(null);
  const [isRegistered, setIsRegistered] = useState(null);
  const [all, setAll] = useState(null);

  Logger.setLogLevel("INFO")

  useEffect(() => {
    const isRegistered = db.isRegistered();
    setIsRegistered(isRegistered)
  }, [])

  const load = useCallback(async () => {
    
    try{
      setIsLoading(true)
      await db.db().load()
      const data = await db.all({decrypt: false, fullOp: true})
      setAll(data)

      const isRegistered = db.isRegistered();
      setIsRegistered(isRegistered)
    
    }
    catch(e){
      console.log(e)
    }
    finally{
      setIsLoading(false)
    }
  }, [isRegistered])


  useEffect(() => {
    load()
  }, [load])


  return <div className="member-page">
            Connected 👋
            <button onClick={() => load()}>Refresh</button>
            {!isRegistered ?
              <button onClick={() => db.register()}>Register</button>
            :
            <>
              {/** Create **/}
              <CreateResourceComponent/>
              

              {all ? all.map(d => {
                return <ViewResourceComponent _key={d.payload.key}/>
              }) : null}

              <div>
                <pre>
                  {
                    all ? JSON.stringify(all, null, 2) : ""
                  }
                </pre>
              </div>
            </>
            }
            
            
            
        </div>
}

export default Home;
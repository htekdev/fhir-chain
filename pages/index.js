
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useContext } from "react";
import { DataStoreContext, DocumentsDbContext, IdentityContext } from "../lib/tools";

const Home = () => {
  const { db } = useContext(DataStoreContext);
  
  const [id, setId] = useState(null);
  const [resourceType, setResourceType] = useState(null);
  const [payload, setPayload] = useState(null);
  const isValid = id && resourceType && (() => {try{JSON.parse(payload); return true;}catch{return false}})();
  const exiting = id ? db.get(id) : null;
  return <div className="member-page">
            Connected 👋

            <input onChange={t => setId(t.target.value)} value={id}></input>
            <input onChange={t => setResourceType(t.target.value)} value={resourceType}></input>
            <textarea onChange={t => setPayload(t.target.value)} value={payload}></textarea>

            {isValid ? <button onClick={() => db.put({
              _id: id,
              resourceType: resourceType,
              ...JSON.parse(payload)
            })}>Save</button> : null}


            <div>{exiting ? JSON.stringify(exiting) : ""}</div>
        </div>
}

export default Home;
'use strict'

const merge = require("lodash.merge")
const { DocumentStore } = require("orbit-db")
const Identities = require("orbit-db-identity-provider")
const FHIRResourceIndex = require("./FHIRResourceIndex")

class FHIRResourceStore extends DocumentStore {
  static version() { return 2 }
  constructor (ipfs, identity, dbname, options) {
    if (!options) options = {}
    if (!options.indexBy) Object.assign(options, { indexBy: v => FHIRResourceStore.toKey(v.resourceType, v.id) })
    if (!options.Index) Object.assign(options, { Index: FHIRResourceIndex })

    
    super(ipfs, identity, dbname, options)
    this.encrypto = options.encrypto
    this._type = 'fhir'

    this.events.on('peer', peer => {
      console.log("No Peer %s", peer)
    })
    this.events.on('peer.exchanged', (peer, address, heads) => {
      console.log(`Received ${heads.length} heads for '${address}' from peer ${peer}:\n`, JSON.stringify(heads.map(e => e.hash), null, 2))
    })
    this.events.on('replicated', (address) => {
      console.log(`Replicated Address ${address}`)
      this.saveSnapshot().then(snapshot => {
        console.log(`Snapshot ${snapshot}`)
        console.log(snapshot)
      })
    })
    this.events.on('load', (address, heads) => {
      console.log(`Loading Address ${address} with:\n`, JSON.stringify(heads.map(e => e.hash), null, 2))
      this.saveSnapshot().then(snapshot => {
        console.log(`Snapshot ${snapshot}`)
        console.log(snapshot)
      })
    })
    this.events.on('replicated.progress', (address, hash, entry, progress, have)=> {
      console.log(`Replicating Address ${address}, hash ${hash}, entry ${entry}, progresss ${progress}, have: ${have}`)
    })
    console.log(`FHIR Store was created`)
  }
  
  static toKey(resourceType, id) {return `${resourceType}/${id}`}

  /**
   * Registers the current identity to the store
   * @param {} options 
   * @returns 
   */
  async register(options = {}){
    if (!options.pin) Object.assign(options, { pin: true })

    const publicKey = await this.encrypto.publicKey();
    console.log("[register] Public Key From Identity Provider %s", publicKey)
    return await this._addOperation({
      op: 'REGISTER',
      address: this.encrypto.address,
      publicKey: publicKey,
      version: FHIRResourceStore.version()
    }, options)
  }

  /**
   * Get Resource by Resource Type and ID
   * @param {*} key 
   * @param {*} fullOp 
   * @returns 
   */
  async get (key, options = {}) {
    if (!options) options = {}
    if (!options.fullOp) Object.assign(options, { fullOp: false })
    if (!options.exact) Object.assign(options, { exact: false })

    var results = (await Promise.all(
        Object.keys(this._index._index)

        // Filter only keys that match
        .filter(e => {
          if(options.exact){
            return e === key
          }
          return e.indexOf(key) !== -1
        })

        // Get Content
        .map(e => this._index.get(e, options.fullOp))

        .filter(e => {
          var addressHavingAccess = this.encrypto.getAddressesFromMultiEnc( options.fullOp ? e.payload.value : e)
          const result = addressHavingAccess.filter(b=>b == this.encrypto.address).length >= 1
          return result;
        })

        // Decrypt
        .map(async e => {
          
          if(!options.decrypt){
            return e
          }
          if(!options.fullOp){
            return await this.encrypto.decryptJSONMulti(e)
          }


          return {
            ...e,
            payload: {
              ...e.payload,
              value: await this.encrypto.decryptJSONMulti(e.payload.value)
            }
          }
        })
        
      ))
      .filter(e => {
        if(options.fullOp){
          return e.payload.value !== null;
        }
        return e !== null;
      })

      if(options.exact){
        return results[0]
      }
      return results;
  }

  /**
   * Get Resource by Resource Type and ID
   * @param {*} key 
   * @param {*} fullOp 
   * @returns 
   */
   async getAll (options = {}) {
    if (!options) options = {}
    if (!options.fullOp) Object.assign(options, { fullOp: false })

    var results = (await Promise.all(
      Object.keys(this._index._index)

      // Get Content
      .map(e => this._index.get(e, options.fullOp))

      
      .filter(e => {
        var addressHavingAccess = this.encrypto.getAddressesFromMultiEnc( options.fullOp ? e.payload.value : e)
        const result = addressHavingAccess.filter(b=>b == this.encrypto.address).length == 1
        return result;
      })
      
      // Decrypt
      .map(async e => {
        
        if(!options.decrypt){
          return e
        }
        if(!options.fullOp){
          return await this.encrypto.decryptJSONMulti(e)
        }


        return {
          ...e,
          payload: {
            ...e.payload,
            value: await this.encrypto.decryptJSONMulti(e.payload.value)
          }
        }
      })
    ))
    .filter(e => {
      if(options.fullOp){
        return e.payload.value !== null;
      }
      return e !== null;
    })

    return results;
  }
  /**
   * Query all resources and filter based on mapper
   * @param {*} mapper 
   * @param {*} options 
   * @returns 
   */
  async query (mapper, options = {}) {
    if (!options) options = {}
    if (!options.fullOp) Object.assign(options, { fullOp: false })
    if (!options.exact) Object.assign(options, { exact: false })
    if (!options.decrypt) Object.assign(options, { decrypt: true })
    
    return await Promise.all(
      Object.keys(this._index._index)

        // Get Content
        .map(e => this._index.get(e))

        // Decrypt
        .map(async e => e[this.identity.id] ? await this.encrypto.decryptJSON(e[this.identity.id]) : null)
        
        // Remove items that need to be excluded
        .filter(e => e !== null)

        // Remove items that need to be excluded
        .filter(mapper)
      )
  }
  
  /**
   * Create new resource
   * @param {*} mapper 
   * @param {*} options 
   * @returns 
   */
  isRegistered (address, options = {}) {
    address = address || this.identity.id

    if(this._index._profiles[address]){
      return true;
    }
    return false;
  }

  /**
   * Create new resource
   * @param {*} mapper 
   * @param {*} options 
   * @returns 
   */
  async create (_doc, options = {}) {
    if (!options.pin) Object.assign(options, { pin: true })
    if (! this.options.indexBy(_doc)) { throw new Error(`The provided document doesn't contain field '${this.options.indexBy}'`) }
    const doc = _doc
    return await this._addAsyncOperation(async () => {
      
      const previous = this._index.get(this.options.indexBy(doc));
      if(previous){
        throw new Error(`Doc already exists by the id of ${this.options.indexBy(doc)}`)
      }
      
      const addresses = [this.identity.id]
      const publicKeys = {}
      addresses.forEach(a => this._index._profiles[a] && (publicKeys[a] = this._index._profiles[a]))
      
      var payload = {
        op: 'CREATE',
        key: this.options.indexBy(doc),
        value: await this.encrypto.encryptJSONMulti(doc, publicKeys),
        version: FHIRResourceStore.version()
      }

      return payload;
      
    }, options)
  }

  /**
   * Patch existing resource
   * @param {*} mapper 
   * @param {*} options 
   * @returns 
   */
  async patch (doc, options = {}) {
    if (!options.pin) Object.assign(options, { pin: true })
    if (! this.options.indexBy(doc)) { throw new Error(`The provided document doesn't contain field '${this.options.indexBy}'`) }
    
    return await this._addAsyncOperation(async () => {
      
      const previousDoc = this.get(this.options.indexBy(doc));
      if(!previousDoc){
        throw new Error(`${this.options.indexBy(doc)} is either not accessable by you or doesnt exists`)
      }

      const previous = this._index.get(this.options.indexBy(doc));
      const previousAddress = this.encrypto.getAddressesFromMultiEnc(previous) || []
      const addresses = [...previousAddress]
      const publicKeys = {}
      addresses.forEach(a => this._index._profiles[a] && (publicKeys[a] = this._index._profiles[a]))
      
      var patched = merge(previousDoc, doc)
      var payload = {
        op: 'PATCH',
        key: this.options.indexBy(doc),
        value: await this.encrypto.encryptJSONMulti(patched, publicKeys),
        version: FHIRResourceStore.version()
      }

      return payload;
      
    }, options)
  }

  /**
   * Update existing resource
   * @param {*} mapper 
   * @param {*} options 
   * @returns 
   */
  async update (doc, options = {}) {
    if (!options.pin) Object.assign(options, { pin: true })
    if (! this.options.indexBy(doc)) { throw new Error(`The provided document doesn't contain field '${this.options.indexBy}'`) }
    
    return await this._addAsyncOperation(async () => {
      
      const previousDoc = this.get(this.options.indexBy(doc));
      if(!previousDoc){
        throw new Error(`${this.options.indexBy(doc)} is either not accessable by you or doesnt exists`)
      }
      
      const previous = this._index.get(this.options.indexBy(doc));
      const previousAddress = this.encrypto.getAddressesFromMultiEnc(previous) || []
      const addresses = [...previousAddress]
      const publicKeys = {}
      addresses.forEach(a => this._index._profiles[a] && (publicKeys[a] = this._index._profiles[a]))
      
      var payload = {
        op: 'UPDATE',
        key: this.options.indexBy(doc),
        value: await this.encrypto.encryptJSONMulti(doc, publicKeys),
        version: FHIRResourceStore.version()
      }

      return payload;
      
    }, options)
  }
  /**
   * Update existing resource
   * @param {*} mapper 
   * @param {*} options 
   * @returns 
   */
 async share (key, address, options = {}) {
  if (!options.pin) Object.assign(options, { pin: true })
  return await this._addAsyncOperation(async () => {
    
    if (! this._index._profiles[address] ) { throw new Error(`No registration found for address ${address}`) }
  
    const previousDoc = await this.get(key, {exact: true, decrypt: true});
    if(!previousDoc){
      throw new Error(`${key} is either not accessable by you or doesnt exists`)
    }

    const previous = this._index.get(key);
    const previousAddress = this.encrypto.getAddressesFromMultiEnc(previous) || []
    const addresses = [...previousAddress, address ]
    const publicKeys = {}
    addresses.forEach(a => this._index._profiles[a] && (publicKeys[a] = this._index._profiles[a]))
    
    var payload = {
      op: 'SHARE',
      key: key,
      value: await this.encrypto.encryptJSONMulti(previousDoc, publicKeys),
      version: FHIRResourceStore.version()
    }

    return payload;
    
  }, options)
}
  
  /**
   * Delete existing resource
   * @param {*} mapper 
   * @param {*} options 
   * @returns 
   */
  async delete (key, options = {}) {
    if (!options.pin) Object.assign(options, { pin: true })
    if (!this._index.get(key)) { throw new Error(`No entry with key '${key}' in the database`) }

    return this._addOperation({
      op: 'DELETE',
      key: key,
      value: null,
      version: FHIRResourceStore.version()
    }, options)
  }

  /**
   * Verify existing resource
   * @param {*} mapper 
   * @param {*} options 
   * @returns 
   */
  async verify (key, options = {}) {
    if (!options.pin) Object.assign(options, { pin: true })
    if (!this._index.get(key)) { throw new Error(`No entry with key '${key}' in the database`) }

    return await this._addAsyncOperation(async () => {
      
      const doc = this.get(key);
      const previous = this._index.get(key, {fullOp: true});
      
      const verifiers = [
        ...(previous.payload.verifiers || []),
        this.identity.provider.signIdentity(JSON.stringify(doc) + JSON.stringify(previous.payload.value))
      ]
      var payload = {
        op: 'VERIFY',
        key: this.options.indexBy(doc),
        value: verifiers,
        version: FHIRResourceStore.version()
      }

      return payload;
      
    }, options)
  }
    
    

  async _addAsyncOperation (dataCallback, { onProgressCallback, pin = false } = {}) {
    async function addOperation () {
      if (this._oplog) {
        // check local cache for latest heads
        if (this.options.syncLocal) {
          await this.syncLocal()
        }
        const data = await dataCallback()
        const entry = await this._oplog.append(data, this.options.referenceCount, pin)
        this._recalculateReplicationStatus(entry.clock.time)
        await this._cache.set(this.localHeadsPath, [entry])
        await this._updateIndex()
        this.events.emit('write', this.address.toString(), entry, this._oplog.heads)
        if (onProgressCallback) onProgressCallback(entry)
        return entry.hash
      }
    }
    return this._queue.add(addOperation.bind(this))
  }
}
module.exports = FHIRResourceStore

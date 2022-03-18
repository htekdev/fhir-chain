
'use strict'
const { io } = require('orbit-db/src/utils')
const IPFSAccessController = require('orbit-db-access-controllers/src/ipfs-access-controller')
const FHIRResourceStore = require('./FHIRResourceStore')
const type = 'fhir'
class FHIRResourceAccessController extends IPFSAccessController {
  constructor (ipfs, options) {
    super(ipfs, options)
    this.encrypto = options.encrypto
  }

  // Returns the type of the access controller
  static get type () { return type }


  async canAppend (entry, identityProvider) {

    if(entry.payload.version !== FHIRResourceStore.version()){
      console.log(`${entry.payload.op} - ${entry.payload.key} [Access] Not Allowed since we do not support the verssion ${entry.payload.version} of the payload`)
      return false;
    }
    
    if(entry.payload.op === "REGISTER"){
      console.log(`${entry.payload.op} - ${entry.payload.key} [Access] Allowed since we want all registrations`)
      return true;
    }
    
    if(await super.canAppend(entry, identityProvider)){
       console.log(`${entry.payload.op} - ${entry.payload.key} [Access] Allowed due to old code`)
       return true;
    }
    
    if(entry.payload.op === "UPDATE" || entry.payload.op === "PATCH" || entry.payload.op === "DELETE" || entry.payload.op === "VERIFY"){
      var addressHavingAccess = this.encrypto.getAddressesFromMultiEnc(entry.payload.value)
      const result = addressHavingAccess.filter(b=>identityProvider.address).length == 1
      
      console.log(`${entry.payload.op} - ${entry.payload.key} [Access] ${result} was result after seeing the operation of ${entry.payload.op} `)
      return result;
    }
    
    if(entry.payload.op === "SHARE" || entry.payload.op === "CREATE"){
      var addressHavingAccess = this.encrypto.getAddressesFromMultiEnc(entry.payload.value)
      const result =  addressHavingAccess.filter(b=>entry.identity.id).length == 1

      console.log(`${entry.payload.op} - ${entry.payload.key} [Access] ${result} was result after seeing the operation of ${entry.payload.op} `)
      return result;
    }

    console.log(`${entry.payload.op} - ${entry.payload.key} [Access] Not allowed, no option was available for accessss control `)
    return false
  }
  static async create (orbitdb, options = {}) {
    options = { ...options, ...{ write: options.write || [orbitdb.identity.id] } }
    return new FHIRResourceAccessController(orbitdb._ipfs, options)
  }
}

module.exports = FHIRResourceAccessController

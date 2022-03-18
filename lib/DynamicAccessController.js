'use strict'
const { decryptData } = require('./encryption')
// For Hardhat 
const contract = require("../artifacts/contracts/FHIRAccess.sol/FHIRAccess.json");
const AccessController = require('./access-controller-inferface');
const FHIRResourceStore = require('./FHIRResourceStore').default;
const { io } = require('orbit-db/src/utils');

const path = require('path')
// Make sure the given address has '/_access' as the last part
const ensureAddress = address => {
  const suffix = address.toString().split('/').pop()
  return suffix === '_access'
    ? address
    : path.join(address, '/_access')
}

class DynamicAccessController extends AccessController {

  constructor(orbitdb, canAppend){
    super()

    this._orbitdb = orbitdb
    this._canAppend = canAppend;
    this._db = null;
    this._options = {}
  }
  static get type () { return 'dynamic' } // Return the type for this controller
  // Returns the address of the OrbitDB used as the AC
  get address () {
    return this._db.address
  }
  async close () {
    await this._db.close()
  }
  async canAppend(entry, identityProvider) {
    if(entry.payload.version !== FHIRResourceStore.version()){
      return false;
    }
    if(entry.payload.op === "REGISTER"){
      return true;
    }
    if(entry.payload.op === "UPDATE" || entry.payload.op === "PATCH" || entry.payload.op === "DELETE" || entry.payload.op === "VERIFY"){
      var addressHavingAccess = identityProvider.getAddressesFromMultiEnc(previous.payload.value)
      return addressHavingAccess.filter(b=>identityProvider.address).length == 1
    }
    if(entry.payload.op === "SHARE" || entry.payload.op === "CREATE"){
      var addressHavingAccess = identityProvider.getAddressesFromMultiEnc(entry.payload.value)
      return addressHavingAccess.filter(b=>identityProvider.address).length == 1
    }
  
    return false;
  }
  /* Private methods */
  _onUpdate () {
    this.emit('updated')
  }
  async load (address) {
    if (this._db) { await this._db.close() }

    // Force '<address>/_access' naming for the database
    this._db = await this._orbitdb.keyvalue(ensureAddress(address), {
      // use ipfs controller as a immutable "root controller"
      accessController: {
        type: 'ipfs',
        write: this._options.admin || [this._orbitdb.identity.id]
      },
      sync: true
    })

    this._db.events.on('ready', this._onUpdate.bind(this))
    this._db.events.on('write', this._onUpdate.bind(this))
    this._db.events.on('replicated', this._onUpdate.bind(this))

    await this._db.load()
  }

  async save () {
    // return the manifest data
    return {
      address: this._db.address.toString()
    }
  }
  /*
    Every AC needs to have a 'Factory' method
    that creates an instance of the AccessController
  */
  static async create (orbitdb, options) {
    const ac = new DynamicAccessController(orbitdb, options.canAppend)
    await ac.load(options.address || options.name || 'default-access-controller')

    return ac

    
  }





}
module.exports = DynamicAccessController
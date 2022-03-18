'use strict'
const { EthIdentityProvider } = require('orbit-db-identity-provider')
const { encrtyptData, getPublicKey, decryptData } = require('./encryption')

const ethUtil = require("ethereumjs-util")

const type = 'fhir'

class FHIRIdentityProvider extends EthIdentityProvider {
  constructor (options = {}) {
    super(options)
    this.provider = options.provider
    this.address = options.address
  }

  // Returns the type of the identity provider
  static get type () { return type }
  async publicKey(){
    
    return (await getPublicKey(this.address, this.provider)).toString('base64');
  }
  async encrypt(data, options = {}){
    
    const publicKey = options.publicKey || (await getPublicKey(this.address, this.provider))
    return await encrtyptData(publicKey, data)
  }
  getAddressesFromMultiEnc(data){
    return Object.keys(data);
  }
  publicKeyToAddress(publicKey){
    const pubKey = Buffer.from(publicKey, 'base64')
    const addr = ethUtil.publicToAddress(pubKey, true).toString('hex');
    const address = ethUtil.toChecksumAddress("0x"+addr);
    return address;
  }
  async encryptJSONMulti(data, publicKeys){
    const payload = {}
    await Promise.all(Object.entries(publicKeys).map(async ([address, publicKey]) => {
      if(!publicKey){
        throw `Unable to map address ${a} to public key`
      }
      payload[address] = await this.encryptJSON(data, {publicKey: publicKey})
    }))

    return payload;
  }
  async decryptJSONMulti(data){
    if(!data[this.address]){
      return null;
    }
    
    return await this.decryptJSON(data[this.address])
  }
  
  async encryptJSON(data, options = {}){
    return await this.encrypt(JSON.stringify(data), options)
  }
  async decrypt(data, options = {}){
    return decryptData(data, this.address, this.provider)
  }
  async decryptJSON(data, options = {}){
    const decrypted = await this.decrypt(data);
    try{
        return JSON.parse(decrypted);
    }
    catch{
        return null;
    }
  }
}

module.exports = FHIRIdentityProvider
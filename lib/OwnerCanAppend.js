'use strict'
let AccessControllers = require('orbit-db-access-controllers')
const { decryptData } = require('./encryption')
// For Hardhat 
const contract = require("../artifacts/contracts/FHIRAccess.sol/FHIRAccess.json");


class OwnerCanAppend extends AccessController {


  constructor(index){
    this._index = index;
  }
  static get type () { return 'owneronly' } // Return the type for this controller

  async canAppend(entry, identityProvider) {
    var previous_entry = this._index.get(entry.payload.key, true);
    if(!previous_entry){
      return true;
    }
    if(previous_entry.identity.id === entry.identity.id && identityProvider.verifyIdentity(entry.identity)){
      return true;
    }
    return false;
  }
  async grant (access, identity) {
    // Should not grant edit rights to anyone
  } // Logic for granting access to identity
}
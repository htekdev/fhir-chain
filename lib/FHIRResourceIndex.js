'use strict'

class FHIRResourceIndex {
  constructor () {
    this._index = {}
    this._profiles = {}
  }
  getProfile (key, fullOp = false) {
    return fullOp
      ? this._index[key]
      : this._index[key] ? this._index[key].payload.value : null
  }
  get (key, fullOp = false) {
    return fullOp
      ? this._index[key]
      : this._index[key] ? this._index[key].payload.value : null
  }
  async updateIndex (oplog, onProgressCallback) {
    const reducer = async (handled, item, idx) => {
      if (handled[item.payload.key] !== true) {
        
        console.log(`Updating Index for item with key ${item.payload.key}`)
        handled[item.payload.key] = true

        var previous = this.get(item.payload.key, {fullOp: true, exact: true});

        switch(item.payload.op){
          case "CREATE":
            this._index[item.payload.key] = item;
            break;
          case "UPDATE":
            this._index[item.payload.key] = item;
            break;
          case "PATCH":
            this._index[item.payload.key] = item;
            break;
          case "SHARE":
            this._index[item.payload.key] = item;
            break;
          case "DELETE":
            delete this._index[item.payload.key];
            break;
          case "VERIFY":
            this._index[item.payload.key] = {
              ...previous,
              payload:{
                ...previous.payload,
                verifiers: item.payload.value
              }
            }
            break;
          case "REGISTER":
            this._profiles[item.payload.address] = item.payload.publicKey
            break;
        }
      }
      if (onProgressCallback) onProgressCallback(item, idx)
      return handled
    }

    await oplog.values
      .slice()
      .reduce(reducer, {})
  }
}

module.exports = FHIRResourceIndex
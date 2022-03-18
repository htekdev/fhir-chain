import FHIRResourceStore from "./FHIRResourceStore";

export const canFHIRDataBeAppended = async (store, entry, identityProvider) => {
  if(entry.payload.version !== FHIRResourceStore.version()){
    return false;
  }
  if(entry.payload.op === "REGISTER"){
    return true;
  }
  
  if(entry.payload.op === "UPDATE" || entry.payload.op === "PATCH" || entry.payload.op === "DELETE" || entry.payload.op === "VERIFY"){
    var addressHavingAccess = identityProvider.getAddressesFromMultiEnc(entry.payload.value)
    return addressHavingAccess.filter(b=>identityProvider.address).length == 1
  }
  if(entry.payload.op === "SHARE" || entry.payload.op === "CREATE"){
    var addressHavingAccess = identityProvider.getAddressesFromMultiEnc(entry.payload.value)
    return addressHavingAccess.filter(b=>identityProvider.address).length == 1
  }

  return false;
}

import React, { useEffect, useMemo, useState, useCallback, useContext } from "react";
import { encrypt } from '@metamask/eth-sig-util';
import { Web3Context } from './tools';
const ascii85 = require('ascii85');
const bip39 = require('bip39')
const hdkey = require('hdkey')
const ethUtil = require("ethereumjs-util")

export async function getPublicKey(account, provider){

  // Key is returned as base64
  const keyB64 = await provider.request({
    method: 'eth_getEncryptionPublicKey',
    params: [account],
  });
  return Buffer.from(keyB64, 'base64');
}


export async function encrtyptData(publicKey, data) {
  console.log("Encrypt: %s", data)
  // Returned object contains 4 properties: version, ephemPublicKey, nonce, ciphertext
  // Each contains data encoded using base64, version is always the same string
  const enc = encrypt({
    publicKey: publicKey.toString('base64'),
    data: ascii85.encode(data).toString(),
    version: 'x25519-xsalsa20-poly1305',
  });

  // We want to store the data in smart contract, therefore we concatenate them
  // into single Buffer
  const buf = Buffer.from(JSON.stringify(enc))
  
  // In smart contract we are using `bytes[112]` variable (fixed size byte array)
  // you might need to use `bytes` type for dynamic sized array
  // We are also using ethers.js which requires type `number[]` when passing data
  // for argument of type `bytes` to the smart contract function
  // Next line just converts the buffer to `number[]` required by contract function
  // THIS LINE IS USED IN OUR ORIGINAL CODE:
  // return buf.toJSON().data;
  
  // Return just the Buffer to make the function directly compatible with decryptData function
  var final = buf.toString('base64');
  console.log("Encrypt (Final): %s", final)
  return final
}
export async function decryptData(data, address, provider) {
  console.log("Decrypt: %s", data)
  var payload = Buffer.from(data, 'base64')
  var structuredData = JSON.parse(payload);
  // Reconstructing the original object outputed by encryption
  
  // Convert data to hex string required by MetaMask
  const ct = `0x${Buffer.from(JSON.stringify(structuredData), 'utf8').toString('hex')}`;
  // Send request to MetaMask to decrypt the ciphertext
  // Once again application must have acces to the account
  const decrypt = await provider.request({
    method: 'eth_decrypt',
    params: [ct, address],
  });
  var final = ascii85.decode(decrypt).toString();
  console.log("Decrypt (Final): %s", final)
  var toStr = JSON.parse(final)

  console.log("Decrypt (ToStr): %s", toStr)
  console.log("Decrypt (ToStr JSONed): %s", JSON.stringify(toStr))
  console.log("Decrypt (ToStr JSONed Values): %s", Object.values(toStr))
  console.log("Decrypt (ToStr JSONed Values Joined): %s", Object.values(toStr).join(""))
  
  // Decode the base85 to final bytes
  return final
}
import React from 'react';

// Import ThirdWeb
import { ThirdwebWeb3Provider } from '@3rdweb/hooks';
import { DocumentsDbProvider, Web3Provider, IdentityProvider, DataStoreContextProvider, DocumentsDbInstanceProvider } from '../lib/tools';
import FHIRIdentityProvider from '../lib/FHIRIdentityProvider';
import FHIRResourceStore from '../lib/FHIRResourceStore';
import Identities from 'orbit-db-identity-provider';
import OrbitDB, { AccessControllers } from 'orbit-db';
import DynamicAccessController from '../lib/DynamicAccessController';
import FHIRResourceAccessController from '../lib/FHIRResourceAccessController';

// Include what chains you wanna support.
// 4 = Rinkeby.
const supportedChainIds = [1];

// Include what type of wallet you want to support.
// In this case, we support Metamask which is an "injected wallet".
const connectors = {
  injected: {},
};

AccessControllers.addAccessController({ AccessController: FHIRResourceAccessController })
AccessControllers.addAccessController({ AccessController: DynamicAccessController })
Identities.addIdentityProvider(FHIRIdentityProvider);
if(!OrbitDB.isValidType("fhir")){
    OrbitDB.addDatabaseType("fhir", FHIRResourceStore);
}


export default function MyApp({ Component, pageProps }) {
    return <React.StrictMode>
                <ThirdwebWeb3Provider connectors={connectors} supportedChainIds={supportedChainIds}>
                    <Web3Provider>
                        <IdentityProvider>
                            <DocumentsDbInstanceProvider>
                                <DocumentsDbProvider name={"fhir.resources"}>
                                    <DataStoreContextProvider>
                                        <Component {...pageProps} />
                                    </DataStoreContextProvider>
                                </DocumentsDbProvider>
                            </DocumentsDbInstanceProvider>
                        </IdentityProvider>
                    </Web3Provider>
                </ThirdwebWeb3Provider>
            </React.StrictMode>
  }
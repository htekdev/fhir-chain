import React from 'react';

// Import ThirdWeb
import { ThirdwebWeb3Provider } from '@3rdweb/hooks';
import { DocumentsDbProvider, Web3Provider, IdentityProvider, DataStoreContextProvider } from '../lib/tools';

// Include what chains you wanna support.
// 4 = Rinkeby.
const supportedChainIds = [1];

// Include what type of wallet you want to support.
// In this case, we support Metamask which is an "injected wallet".
const connectors = {
  injected: {},
};

export default function MyApp({ Component, pageProps }) {
    return <React.StrictMode>
                <ThirdwebWeb3Provider connectors={connectors} supportedChainIds={supportedChainIds}>
                    <Web3Provider>
                        <IdentityProvider>
                            <DocumentsDbProvider name={"fhir.resources"}>
                                <DataStoreContextProvider>
                                    <Component {...pageProps} />
                                </DataStoreContextProvider>
                            </DocumentsDbProvider>
                        </IdentityProvider>
                    </Web3Provider>
                </ThirdwebWeb3Provider>
            </React.StrictMode>
  }
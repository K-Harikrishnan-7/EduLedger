import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import UniversityRegistryArtifact from '../contracts/artifacts/contracts/UniversityRegistry.sol/UniversityRegistry.json';
import AcademicCredentialSBTArtifact from '../contracts/artifacts/contracts/AcademicCredentialSBT.sol/AcademicCredentialSBT.json';
import ConsentManagerArtifact from '../contracts/artifacts/contracts/ConsentManager.sol/ConsentManager.json';
import contractAddresses from '../contracts/addresses.json';

const Web3Context = createContext(null);

export const useWeb3 = () => {
    const context = useContext(Web3Context);
    if (!context) throw new Error('useWeb3 must be used within Web3Provider');
    return context;
};

export const Web3Provider = ({ children }) => {
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [account, setAccount] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [contracts, setContracts] = useState({});
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);

    const initializeContracts = useCallback(async (signerInstance, networkChainId) => {
        const networkKey = networkChainId === '31337' || networkChainId === 31337 ? 'localhost' : 'sepolia';
        const addresses = contractAddresses[networkKey];

        if (!addresses) {
            console.warn('No contract addresses found for network:', networkKey);
            return {};
        }

        const registryContract = new Contract(
            addresses.UniversityRegistry,
            UniversityRegistryArtifact.abi,
            signerInstance
        );

        const credentialContract = new Contract(
            addresses.AcademicCredentialSBT,
            AcademicCredentialSBTArtifact.abi,
            signerInstance
        );

        const consentContract = new Contract(
            addresses.ConsentManager,
            ConsentManagerArtifact.abi,
            signerInstance
        );

        const initialized = {
            registry: registryContract,
            credential: credentialContract,
            consent: consentContract,
        };
        setContracts(initialized);
        return initialized;
    }, []);

    const connectWallet = async () => {
        if (typeof window.ethereum === 'undefined') {
            setError('MetaMask is not installed. Please install MetaMask to continue.');
            return;
        }

        try {
            setIsConnecting(true);
            setError(null);

            const browserProvider = new BrowserProvider(window.ethereum);
            const accounts = await browserProvider.send('eth_requestAccounts', []);
            const network = await browserProvider.getNetwork();
            const signerInstance = await browserProvider.getSigner();

            setProvider(browserProvider);
            setSigner(signerInstance);
            setAccount(accounts[0]);
            setChainId(network.chainId.toString());
            setIsConnected(true);

            await initializeContracts(signerInstance, network.chainId.toString());
        } catch (err) {
            console.error('Wallet connection error:', err);
            // Show friendly messages instead of raw ethers errors
            const code = err?.code ?? err?.info?.error?.code;
            if (code === 4001 || err?.reason === 'rejected') {
                setError('Connection cancelled. Click "Connect Wallet" and approve in MetaMask.');
            } else if (code === -32002) {
                setError('MetaMask is already waiting for your approval. Open MetaMask and check for a pending request.');
            } else if (code === -32603) {
                setError('MetaMask internal error. Try refreshing the page.');
            } else {
                setError('Could not connect wallet. Make sure MetaMask is unlocked and on the correct network (Hardhat Local or Sepolia).');
            }
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectWallet = useCallback(() => {
        setProvider(null);
        setSigner(null);
        setAccount(null);
        setChainId(null);
        setContracts({});
        setIsConnected(false);
    }, []);

    // Reset all wallet state (called on logout — does NOT revoke MetaMask permissions)
    const resetWeb3 = useCallback(() => {
        setProvider(null);
        setSigner(null);
        setAccount(null);
        setChainId(null);
        setContracts({});
        setIsConnected(false);
        setError(null);
    }, []);

    // Auto-reconnect ONLY if there is an active EduLedger session token
    useEffect(() => {
        if (typeof window.ethereum !== 'undefined') {
            const sessionToken = localStorage.getItem('eduleger_token');
            if (!sessionToken) return; // no session — don't auto-connect
            window.ethereum.request({ method: 'eth_accounts' }).then(async (accounts) => {
                if (accounts.length > 0) {
                    await connectWallet();
                }
            });
        }
    }, []); // eslint-disable-line

    // Clear wallet state on app logout (prevents university MetaMask persisting for company)
    useEffect(() => {
        const handleLogout = () => resetWeb3();
        window.addEventListener('eduleger:logout', handleLogout);
        return () => window.removeEventListener('eduleger:logout', handleLogout);
    }, [resetWeb3]);

    // Listen for account and chain changes
    useEffect(() => {
        if (!window.ethereum) return;

        const handleAccountsChanged = (accounts) => {
            if (accounts.length === 0) {
                disconnectWallet();
            } else {
                setAccount(accounts[0]);
            }
        };

        const handleChainChanged = () => {
            window.location.reload();
        };

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        return () => {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', handleChainChanged);
        };
    }, [disconnectWallet]);

    const value = {
        provider,
        signer,
        account,
        chainId,
        contracts,
        isConnecting,
        isConnected,
        error,
        connectWallet,
        disconnectWallet,
        resetWeb3,
        // Returns true if the connected MetaMask account matches the expected wallet (case-insensitive)
        isWalletMatch: (expected) =>
            !!account && !!expected && account.toLowerCase() === expected.toLowerCase(),
        // Helpers
        // Returns true if connected MetaMask chain matches the configured chain (Hardhat or Sepolia)
        isLocalNetwork: chainId === '31337' || chainId === 31337,
        isSepoliaNetwork: chainId === '11155111' || chainId === 11155111,
        shortAccount: account ? `${account.slice(0, 6)}...${account.slice(-4)}` : null,
    };

    return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

// src/context/NetworkContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Network from 'expo-network';

const NetworkContext = createContext(null);

export const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    checkConnection();
    // Vérifier la connexion toutes les 30 secondes
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      setIsOnline(networkState.isConnected && networkState.isInternetReachable);
    } catch {
      setIsOnline(false);
    }
  };

  const syncData = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLastSync(new Date());
    } catch (error) {
      console.error('Erreur sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <NetworkContext.Provider value={{
      isOnline,
      isSyncing,
      lastSync,
      syncData,
      checkConnection,
    }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork doit être dans NetworkProvider');
  return ctx;
};
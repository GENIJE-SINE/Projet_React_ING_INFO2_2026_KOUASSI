import React from 'react';
import { StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import { AuthProvider } from './src/context/AuthContext';
import { NetworkProvider } from './src/context/NetworkContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      {/* Ajout d'une StatusBar pour que l'heure/batterie s'affiche bien */}
      <StatusBar barStyle="dark-content" />
      
      <NetworkProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </NetworkProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, // Indispensable pour que GestureHandlerRootView occupe tout l'écran
  },
});
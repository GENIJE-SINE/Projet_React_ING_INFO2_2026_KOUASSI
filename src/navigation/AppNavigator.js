// src/navigation/AppNavigator.js
import 'react-native-gesture-handler'; 
import React from 'react';
import { StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { COLORS, TYPOGRAPHY } from '../styles/theme';


import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import BulletinScreen from '../screens/BulletinScreen';
import MatriceScreen from '../screens/MatriceScreen';
import SaisieNotesScreen from '../screens/SaisieNotesScreen';
import AdminScreen from '../screens/AdminScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RattrapageAdminScreen from '../screens/RattrapageAdminScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Options d'en-tête communes - style liquid glass
const headerScreenOptions = {
  headerStyle: {
    backgroundColor: 'rgba(232, 239, 248, 0.98)',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100, 140, 200, 0.18)',
  },
  headerTitleStyle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerTintColor: COLORS.accent,
  headerBackTitleVisible: false,
};

// ─── Onglets du bas ─────────────────────────────────────────
function TabNavigator() {
  const { isAdmin, isEnseignant } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={function({ route }) {
        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'rgba(232, 239, 248, 0.97)',
            borderTopWidth: 1,
            borderTopColor: 'rgba(100, 140, 200, 0.18)',
            height: Platform.OS === 'ios' ? 84 : 64,
            paddingBottom: Platform.OS === 'ios' ? 24 : 8,
            paddingTop: 8,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: COLORS.textTertiary,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
          tabBarIcon: function({ focused, color }) {
            var iconMap = {
              Accueil: focused ? 'home' : 'home-outline',
              Matrice: focused ? 'grid' : 'grid-outline',
              Notes: focused ? 'create' : 'create-outline',
              Admin: focused ? 'shield-checkmark' : 'shield-checkmark-outline',
              Profil: focused ? 'person' : 'person-outline',
            };
            var iconName = iconMap[route.name] || 'ellipse-outline';
            return React.createElement(Ionicons, { name: iconName, size: 22, color: color });
          },
        };
      }}
    >
      <Tab.Screen name="Accueil" component={HomeScreen} />
      <Tab.Screen name="Matrice" component={MatriceScreen} />
      {(isAdmin() || isEnseignant()) && (
        <Tab.Screen name="Notes" component={SaisieNotesScreen} />
      )}
      {isAdmin() && (
        <Tab.Screen name="Admin" component={AdminScreen} />
      )}
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

//  Stack authentifié 
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={headerScreenOptions}>
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Bulletin"
        component={BulletinScreen}
        options={{ title: 'Bulletin de Notes' }}
      />
      <Stack.Screen
        name="RattrapageAdmin"
        component={RattrapageAdminScreen}
        options={{ title: 'Gestion des Rattrapages' }}
      />
    </Stack.Navigator>
  );
}

// ─── Stack public (non connecté) ────────────────────────────
function PublicStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

// ─── Navigateur principal ───────────────────────────────────
function AppNavigator() {
  var auth = useAuth();
  var user = auth.user;
  var loading = auth.loading;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
  <NavigationContainer>
    {user ? <AuthStack /> : <PublicStack />}
  </NavigationContainer>
);
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default AppNavigator;
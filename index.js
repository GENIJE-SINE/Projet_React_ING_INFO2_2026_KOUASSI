import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';

// 2. Imports des bibliothèques
import { registerRootComponent } from 'expo';
import { enableScreens } from 'react-native-screens';

// 3. Configuration (Optionnel sur les versions récentes d'Expo, mais sans danger)
enableScreens(true);

// 4. Import de ton composant principal
import App from './App';

// 5. Enregistrement
registerRootComponent(App);
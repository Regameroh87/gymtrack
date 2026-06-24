import AsyncStorage from "@react-native-async-storage/async-storage";
import { setStorageAdapter } from "@gymtrack/core/storage";

// AsyncStorage ya implementa la interfaz del adapter de core
// (getItem/setItem/removeItem/getAllKeys/multiGet/multiSet), así que se inyecta
// tal cual. Side-effect: se importa al tope del layout raíz para que quede
// configurado antes de que cualquier hook de core toque el storage. La web
// inyectará en su lugar un adapter sobre localStorage.
setStorageAdapter(AsyncStorage);

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './style.css';

// Create Vue application
const app = createApp(App);

// Install Pinia for state management
const pinia = createPinia();
app.use(pinia);

// Mount the application
app.mount('#app');

// Log startup info in development
if (import.meta.env.DEV) {
    console.log('🧠 Neural Hive starting in development mode...');
}

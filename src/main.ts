import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import './style.css'

// Create Vue application
const app = createApp(App)

// Install plugins
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(i18n)

// Mount the application
app.mount('#app')

// Log startup info in development
if (import.meta.env.DEV) {
  console.log('Neural Hive starting in development mode...')
}

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/main.css'
import './features/hearthstone/styles/hearthstone-legacy.css'
import './styles/analytics-and-responsive.css'
import './features/hearthstone/styles/hearthstone-theme.css'
import './styles/site-extras.css'

createApp(App).use(router).mount('#app')

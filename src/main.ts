import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'
import '../node_modules/@firstnoodle-ui/bui/dist/bui.css'

createApp(App).use(router).mount('#app')

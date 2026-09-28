import { Livewire, Alpine } from "../../vendor/livewire/livewire/dist/livewire.esm";

import swal from 'sweetalert2';
window.Swal = swal;

import './bootstrap';
import 'flowbite';
import { createApp } from 'vue';
import axios from 'axios';
// import Helpers from './plugins/helpers';
import Toast, { POSITION } from "vue-toastification";
// import $ from 'jquery';
// window.$ = window.jQuery = $;

import flatpickr from "flatpickr";
import Quill from "quill";
import * as FilePond from "filepond";
import { createPopper } from "@popperjs/core";
import focus from "@alpinejs/focus";
import "@tabler/icons-webfont/tabler-icons.min.css";
// Import the plugin code
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';

// Import the plugin styles
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';

Alpine.plugin(focus);

// Import the plugin code
import FilePondPluginImageCrop from 'filepond-plugin-image-crop';
import FilePondPluginImageResize from 'filepond-plugin-image-resize';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';


// Register the plugin
FilePond.registerPlugin(FilePondPluginImageCrop, FilePondPluginImagePreview, FilePondPluginImageResize);

window.flatpickr = flatpickr;
window.FilePond = FilePond;
window.Quill = Quill;
window.createPopper = createPopper;
window.Pusher = Pusher;

axios.defaults.baseURL                            = import.meta.env.VITE_APP_URL || window.location.origin + '/';
axios.defaults.headers.common['X-Requested-With'] = "XMLHttpRequest";
axios.defaults.headers.post  ['X-CSRF-TOKEN']     = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

// Vue.js Components
import PostProject from './components/main/post/project/project.vue';
import EditProject from './components/main/account/projects/edit.vue';

// Get app element
const app_element = document.getElementById("app");
const app = createApp({});

app.component('post-project', PostProject);
app.component('edit-project', EditProject);

// app.use(Helpers);
app.use(Toast, {
    position: POSITION.BOTTOM_CENTER
});
if (app_element) {
    app.mount('#app');
}

Livewire.start();


const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
window.Echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
    forceTLS: (import.meta.env.VITE_PUSHER_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: "/broadcasting/auth",

    auth: {
        headers: {
            'X-CSRF-TOKEN': csrf,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        },
        withCredentials: true
    }
});

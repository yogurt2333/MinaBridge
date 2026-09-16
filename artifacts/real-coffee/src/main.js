import './global.css';
import Page0 from './pages/0.vue';
import Page1 from './pages/1.vue';
import Page2 from './pages/2.vue';
import Vue from 'vue';
import { mountPages } from './navigation.js';
const routes = {"packageWeStoreCoffee/pages/home/home": Page0,"packageWeStoreCoffee/pages/sku-picker/sku-picker": Page1,"packageWeStoreCoffee/pages/checkout/checkout": Page2};
mountPages(Vue, routes, "bdedea9a86d5d7aea521054687082946c84126b588246630eeb8fc10bdc3beb8");

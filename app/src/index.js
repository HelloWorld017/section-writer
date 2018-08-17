import "../less/index.less";

import App from "../components/App.vue";
import Vue from "vue";
import VueRipple from "vue-ripple-directive";
import VueRippleSmall from "../directives/VueRippleSmall";

Vue.directive('ripple', VueRipple);
Vue.directive('ripple-small', VueRippleSmall);

new Vue({
	el: "#app",
	render(h) {
		return h(App);
	}
});

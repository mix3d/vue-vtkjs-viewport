// Import vue component
import MPRManager from "@/library/VTKViewport/2DMPRManager.vue";
import _consts from "@/library/VTKViewport/consts.js";

// Export constant values
export const consts = _consts;

// To allow use as module (npm/webpack/etc.) export component
export default MPRManager;

// Declare install function executed by Vue.use()
export function install(Vue) {
  if (install.installed) return;
  install.installed = true;
  Vue.component("mpr-manager", MPRManager);
}

// Create module definition for Vue.use()
const plugin = {
  install
};

// Auto-install when vue is found (eg. in browser via <script> tag)
let GlobalVue = null;
if (typeof window !== "undefined") {
  GlobalVue = window.Vue;
} else if (typeof global !== "undefined") {
  GlobalVue = global.Vue;
}
if (GlobalVue) {
  GlobalVue.use(plugin);
}

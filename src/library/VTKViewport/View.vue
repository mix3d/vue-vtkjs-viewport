<template>
  <div class="viewer">
    <div ref="container" class="viewer" />
    <ViewportOverlay v-bind="dataDetails" />
  </div>
</template>

<script>
import vtkGenericRenderWindow from "vtk.js/Sources/Rendering/Misc/GenericRenderWindow";
import vtkWidgetManager from "vtk.js/Sources/Widgets/Core/WidgetManager";
// Use modified MPRSlice interactor
//import vtkInteractorStyleMPRSlice from 'vtk.js/Sources/Interaction/Style/InteractorStyleMPRSlice';
// import vtkInteractorStyleMPRSlice from "./vtkInteractorStyleMPRSlice.js";

import { createSub } from "../lib/createSub.js";

import ViewportOverlay from "../ViewportOverlay/ViewportOverlay.vue";

export default {
  name: "view-generic",
  components: { ViewportOverlay },
  props: {
    // Displayed on the overlay
    /* dataDetails: {
      studyDate: String,
      studyTime: String,
      studyDescription: String,
      patientName: String,
      patientId: String,
      seriesNumber: String,
      seriesDescription: String
    }*/
    dataDetails: Object,

    onCreated: Function,
    onDestroyed: Function
  },
  created() {
    this.genericRenderWindow = null;
    this.widgetManager = vtkWidgetManager.newInstance();
  },
  data() {
    return {
      subs: {
        interactor: createSub(),
        data: createSub()
      }
    };
  },

  methods: {
    onResize() {
      // TODO: debounce
      this.genericRenderWindow.resize();
    }
  },

  mounted() {
    window.addEventListener("resize", this.onResize);

    this.genericRenderWindow = vtkGenericRenderWindow.newInstance({
      background: [0, 0, 0]
    });

    this.genericRenderWindow.setContainer(this.$refs.container);

    let widgets = [];
    let filters = [];

    this.renderer = this.genericRenderWindow.getRenderer();
    this.renderWindow = this.genericRenderWindow.getRenderWindow();

    // const istyle = vtkInteractorStyleMPRSlice.newInstance();
    // this.istyle = istyle;
    // this.renderWindow.getInteractor().setInteractorStyle(istyle);

    this.widgetManager.setRenderer(this.renderer);

    /*
    TODO: Enable normal orthogonal slicing / window level as default instead of
    rotation tool

    const istyle = CustomSliceInteractorStyle.newInstance();
    this.istyle = istyle
    this.renderWindow.getInteractor().setInteractorStyle(istyle)
    istyle.setCurrentVolumeNumber(0); // background volume
    istyle.setSlicingMode(1, true); // force set slice mode

    interactor.setInteractorStyle(istyle);
    */

    // TODO: Not sure why this is necessary to force the initial draw
    // this.genericRenderWindow.resize();
    if (this.onCreated) {
      /**
       * Note: The contents of this Object are
       * considered part of the API contract
       * we make with consumers of this component.
       */
      const api = {
        genericRenderWindow: this.genericRenderWindow,
        widgetManager: this.widgetManager,
        container: this.$refs.container,
        widgets,
        filters,
        _component: this
      };

      this.onCreated(api);
    }
  },
  watch: {},
  computed: {
    // voi() {
    //   // TODO: trigger getVOI to update!
    //   console.log("computing voi", getVOI(this.volumes[0]));
    //   return getVOI(this.volumes[0]);
    // }
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.onResize);

    Object.keys(this.subs).forEach(k => {
      this.subs[k].unsubscribe();
    });
    //notify if prop defined
    if (this.onDestroyed) {
      this.onDestroyed();
    }
  }
};
</script>

<style lang="scss" scoped>
.viewer {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>

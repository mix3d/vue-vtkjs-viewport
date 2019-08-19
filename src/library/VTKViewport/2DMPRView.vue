<template>
  <div v-if="volumes && volumes.length" class="viewer2d">
    <div ref="container" class="container2d" />
    <ViewportOverlay v-bind="dataDetails" :voi="voi" />
  </div>
</template>

<script>
/**
 * This view is a simple wrapper for the VTK canvas, returning the VTK canvas component information through a callback during the `mounted` event.
 */

import vtkGenericRenderWindow from "vtk.js/Sources/Rendering/Misc/GenericRenderWindow";
import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';

import { quat, vec3, mat4 } from "gl-matrix";

// Use modified MPRSlice interactor
import vtkInteractorStyleMPRSlice from "./vtkInteractorStyleMPRSlice";
import vtkInteractorStyleMPRCrosshairs from './vtkInteractorStyleMPRCrosshairs';
import vtkInteractorStyleMPRWindowLevel from './vtkInteractorStyleMPRWindowLevel';

import { createSub } from "../lib/createSub.js";
import { degrees2radians } from "../lib/math/angles.js";
import createLabelPipeline from "./createLabelPipeline";

import ViewportOverlay from "../ViewportOverlay/ViewportOverlay.vue";

export default {
  name: "view-2d-mpr",
  components: { ViewportOverlay },
  props: {
    volumes: { type: Array, required: true },
    actors: Array,

    // Front, Side, Top, etc
    index: String,

    //Slice Plane
    slicePlaneNormal: { type: Array, default(){ return [0,0,1] }},
    slicePlaneXRotation: { type: Number, default: 0},
    slicePlaneYRotation: { type: Number, default: 0},
    // Camera view Up
    sliceViewUp: { type: Array, default(){ return [0,1,0] }},
    //0,90,180,270 rotation around the view axis
    viewRotation: {type: Number, default: 0, validator: v => [0,90,180,270].includes(v)},

    sliceThickness: {type: Number, default: 0, validator: v => v > 0 },

    //leveling
    windowWidth: {type: Number, default: 0},
    windowCenter: {type: Number, default: 0},

    blendMode: {type: String},

    dataDetails: Object,
    onCreated: Function,
    onDestroyed: Function,
  },
  created() {
    this.genericRenderWindow = null;
    // this.widgetManager = vtkWidgetManager.newInstance();
    this.cachedSlicePlane = [];
    this.cachedSliceViewUp = [];
  },
  data() {
    return {
      subs: {
        interactor: createSub(),
        data: createSub(),
      }
    };
  },

  methods: {
    onResize() {
      // TODO: debounce
      this.genericRenderWindow.resize();
    },
    updateVolumesForRendering(volumes) {
      if(volumes && volumes.length){
        volumes.forEach(volume => {
          if (!volume.isA("vtkVolume")) {
            console.warn("Data to <Vtk2D> is not vtkVolume data");
          }
          this.renderer.addVolume(volume);
        });
      }
      else {
        this.renderer.removeAllVolumes()
      }
      this.renderWindow.render();
    },
    updateSlicePlane(ops={}){
      // TODO: optimize so you don't have to calculate EVERYTHING every time?

      // TODO: Confirm that we never need to pass overrides
      const input = {
        //defaults
        slicePlaneNormal: this.slicePlaneNormal,
        sliceViewUp: this.sliceViewUp,
        sliceXRot: this.slicePlaneXRotation,
        sliceYRot: this.slicePlaneYRotation,
        viewRotation: this.viewRotation,
        //merge / overwrite function inputs
        ...ops
      }

      // rotate around the vector of the cross product of the plane and viewup as the X component
      let sliceXRot = []
      vec3.cross(sliceXRot, input.sliceViewUp, input.slicePlaneNormal)
      vec3.normalize(sliceXRot, sliceXRot);


      // rotate the viewUp vector as the Y component
      let sliceYRot = this.sliceViewUp

      // const yQuat = quat.create();
      // quat.setAxisAngle(yQuat, input.sliceViewUp, degrees2radians(input.sliceYRot));
      // quat.normalize(yQuat, yQuat);

      // Rotate the slicePlaneNormal using the x & y rotations.
      // const planeQuat = quat.create();
      // quat.add(planeQuat, xQuat, yQuat);
      // quat.normalize(planeQuat, planeQuat);

      // vec3.transformQuat(this.cachedSlicePlane, this.slicePlaneNormal, planeQuat);

      const planeMat = mat4.create()
      mat4.rotate(planeMat, planeMat, degrees2radians(input.sliceYRot), sliceYRot);
      mat4.rotate(planeMat, planeMat, degrees2radians(input.sliceXRot), sliceXRot);
      vec3.transformMat4(this.cachedSlicePlane, this.slicePlaneNormal, planeMat);

      // Rotate the viewUp in 90 degree increments
      const viewRotQuat = quat.create();
      // Use - degrees since the axis of rotation should really be the direction of projection, which is the negative of the plane normal
      quat.setAxisAngle(viewRotQuat, this.cachedSlicePlane, degrees2radians(-input.viewRotation));
      quat.normalize(viewRotQuat, viewRotQuat);

      // rotate the ViewUp with the x and z rotations
      const xQuat = quat.create();
      quat.setAxisAngle(xQuat, sliceXRot, degrees2radians(input.sliceXRot));
      quat.normalize(xQuat, xQuat);
      const viewUpQuat = quat.create();
      quat.add(viewUpQuat, xQuat, viewRotQuat);
      vec3.transformQuat(this.cachedSliceViewUp, this.sliceViewUp, viewRotQuat);

      // update the view's slice
      // FIXME: Store/remember the slice currently looked at, so you rotate around that location instead of the volume center
      const renderWindow = this.genericRenderWindow.getRenderWindow();
      renderWindow
        .getInteractor()
        .getInteractorStyle()
        .setSliceNormal(this.cachedSlicePlane, this.cachedSliceViewUp);

      renderWindow.render()
    },
    onCrosshairPointSelected(data){
      this.$emit('crosshairPointSelected',{...data, index:this.index})
    }
  },
  watch: {
    volumes(newVolumes, oldVolumes) {
      console.log("volumes changed", newVolumes, oldVolumes);
      this.updateVolumesForRendering(newVolumes);
    },

    // Calculate the new normals after applying rotations to the untouched originals
    slicePlaneNormal(){
      this.updateSlicePlane();
    },
    slicePlaneXRotation(){
      this.updateSlicePlane()
    },
    slicePlaneYRotation(){
      this.updateSlicePlane();
    },
    sliceViewUp(){
      this.updateSlicePlane();
    },
    viewRotation(){
      this.updateSlicePlane();
    },

    sliceThickness(thicc) {
      const istyle = this.renderWindow.getInteractor().getInteractorStyle();
      //set thickness if the current interactor has it
      istyle.setSlabThickness && istyle.setSlabThickness(thicc)
      this.renderWindow.render();
    },

    blendMode(mode){
      if(this.sliceThickness > 1) {
        switch(mode){
          case "MIP":
            this.volumes[0].getMapper().setBlendModeToMaximumIntensity()
            break;
          case "MINIP":
            this.volumes[0].getMapper().setBlendModeToMinimumIntensity()
            break;
          case "AVG":
            this.volumes[0].getMapper().setBlendModeToAverageIntensity()
            break;
          default:
            this.volumes[0].getMapper().setBlendModeToComposite()
            break;
        }
      }
      this.renderWindow.render();
    },
  },
  computed: {
    voi() {
      return {windowWidth: this.windowWidth, windowCenter: this.windowCenter};
    }
  },
  mounted() {
    window.addEventListener("resize", this.onResize);

    // cache the view vectors so we can apply the rotations without modifying the original value
    this.cachedSlicePlane = [...this.slicePlaneNormal];
    this.cachedSliceViewUp = [...this.sliceViewUp];

    this.genericRenderWindow = vtkGenericRenderWindow.newInstance({
      background: [0, 0, 0]
    });

    this.genericRenderWindow.setContainer(this.$refs.container);

    let widgets = [];
    let filters = [];
    let actors = [];
    let volumes = [];

    const radius = 5;
    const label = 1;

    this.renderer = this.genericRenderWindow.getRenderer();
    this.renderWindow = this.genericRenderWindow.getRenderWindow();
    // update view node tree so that vtkOpenGLHardwareSelector can access the vtkOpenGLRenderer instance.
    const oglrw = this.genericRenderWindow.getOpenGLRenderWindow();
    oglrw.buildPass(true);

    const istyle = vtkInteractorStyleMPRSlice.newInstance();
    // istyle.setOnScroll(this.onStackScroll)
    const inter = this.renderWindow.getInteractor();
    inter.setInteractorStyle(istyle);

    if (this.actors) {
      actors = actors.concat(this.actors);
    }

    if (this.labelmap && this.labelmap.actor) {
      actors = actors.concat(this.labelmap.actor);
    }

    if (this.volumes) {
      volumes = volumes.concat(this.volumes);
    }

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

    /*
    // TODO: Use for maintaining clipping range for MIP
    const interactor = this.renderWindow.getInteractor();
    //const clippingRange = renderer.getActiveCamera().getClippingRange();

    interactor.onAnimation(() => {
      renderer.getActiveCamera().setClippingRange(...r);
    });*/

    //  TODO: assumes the volume is always set for this mounted state...Throw an error?
    const istyleVolumeMapper = this.volumes[0].getMapper();

    istyle.setVolumeMapper(istyleVolumeMapper);
    // istyle.setSliceNormal([0, 0, 1]);

    //start with the middle slice
    const range = istyle.getSliceRange();
    istyle.setSlice((range[0] + range[1]) / 2);

    // add the current volumes to the vtk renderer
    this.updateVolumesForRendering(this.volumes);

    this.updateSlicePlane();

    // force the initial draw to set the canvas to the parent bounds.
    this.genericRenderWindow.resize();

    if (this.onCreated) {
      /**
       * Note: The contents of this Object are
       * considered part of the API contract
       * we make with consumers of this component.
       */
      this.onCreated({
        genericRenderWindow: this.genericRenderWindow,
        widgetManager: this.widgetManager,
        container: this.$refs.container,
        widgets,
        filters,
        actors,
        volumes,
        _component: this
      });
    }
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.onResize);

    // TODO: https://github.com/Kitware/vtk-js/issues/1157
    // Fallback to manually cleanup things.
    this.genericRenderWindow.setContainer(null);
    this.genericRenderWindow.getOpenGLRenderWindow().delete();
    this.genericRenderWindow.delete()

    delete this.genericRenderWindow;

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
.viewer2d,
.container2d {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>

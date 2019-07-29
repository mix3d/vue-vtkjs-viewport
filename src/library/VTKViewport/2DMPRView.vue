<template>
  <div v-if="volumes && volumes.length" class="viewer2d">
    <div ref="container" class="container2d" />
    <ViewportOverlay v-bind="dataDetails" :voi="voi" />
  </div>
</template>

<script>
import vtkGenericRenderWindow from "vtk.js/Sources/Rendering/Misc/GenericRenderWindow";
import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';

import vtkWidgetManager from "vtk.js/Sources/Widgets/Core/WidgetManager";
import vtkPaintFilter from "vtk.js/Sources/Filters/General/PaintFilter";
import vtkPaintWidget from "vtk.js/Sources/Widgets/Widgets3D/PaintWidget";
import vtkMatrixBuilder from "vtk.js/Sources/Common/Core/MatrixBuilder";
import { ViewTypes } from "vtk.js/Sources/Widgets/Core/WidgetManager/Constants";

import { quat, vec3 } from "gl-matrix";

// Use modified MPRSlice interactor
//import vtkInteractorStyleMPRSlice from 'vtk.js/Sources/Interaction/Style/InteractorStyleMPRSlice';
import vtkInteractorStyleMPRSlice from "./vtkInteractorStyleMPRSlice";
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
    activeTool: {type: String, default: "LEVEL"},
    //Slice Plane
    slicePlaneNormal: { type: Array, default(){ return [0,0,1] }},
    slicePlaneXRotation: { type: Number, default: 0},
    slicePlaneYRotation: { type: Number, default: 0},
    // Camera view Up
    sliceViewUp: { type: Array, default(){ return [0,1,0] }},
    //0,90,180,270 rotation around the view axis
    viewRotation: {type: Number, default: 0},

    painting: { type: Boolean, default: false },
    paintFilterBackgroundImageData: Object,
    paintFilterLabelMapImageData: Object,
    onPaint: Function,
    onPaintStart: Function,
    onPaintEnd: Function,

    interactorStyleVolumeMapper: Object,

    dataDetails: Object,
    onCreated: Function,
    onDestroyed: Function,
  },
  created() {
    this.genericRenderWindow = null;
    this.widgetManager = vtkWidgetManager.newInstance();
    this.cachedSlicePlane = [];
    this.cachedSliceViewUp = [];
  },
  data() {
    return {
      subs: {
        interactor: createSub(),
        data: createSub(),
        labelMap: createSub(),
        paint: createSub(),
        paintStart: createSub(),
        paintEnd: createSub()
      }
    };
  },

  methods: {
    updatePaintbrush() {
      const manip = this.paintWidget.getManipulator();
      const handle = this.paintWidget.getWidgetState().getHandle();
      const camera = this.paintRenderer.getActiveCamera();
      const normal = camera.getDirectionOfProjection();
      manip.setNormal(...normal);
      manip.setOrigin(...camera.getFocalPoint());
      handle.rotateFromDirections(handle.getDirection(), normal);
    },
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
        //TODO: Wait for https://github.com/Kitware/vtk-js/pull/1148 to use
        // this.renderer.removeAllVolumes()
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
      const xQuat = quat.create();
      quat.setAxisAngle(xQuat, sliceXRot, degrees2radians(input.sliceXRot));
      quat.normalize(xQuat, xQuat);

      // rotate the viewUp vector as the Y component
      let sliceYRot = this.sliceViewUp
      const yQuat = quat.create();
      quat.setAxisAngle(yQuat, input.sliceViewUp, degrees2radians(input.sliceYRot));
      quat.normalize(yQuat, yQuat);

      // Rotate the slicePlaneNormal using the x & y rotations.
      const planeQuat = quat.create();
      quat.add(planeQuat, xQuat, yQuat);
      vec3.transformQuat(this.cachedSlicePlane, this.slicePlaneNormal, planeQuat);

      // Rotate the viewUp in 90 degree increments
      const viewRotQuat = quat.create();
      // Use - degrees since the axis of rotation should really be the direction of projection, which is the negative of the plane normal
      quat.setAxisAngle(viewRotQuat, this.cachedSlicePlane, degrees2radians(-input.viewRotation));
      quat.normalize(viewRotQuat, viewRotQuat);

      // rotate the ViewUp with the x and z rotations
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

    activeTool(newTool, oldTool){
      switch(newTool){
        case 'LEVEL':
          break;
        case 'SELECT':
          break;
      }
    },

    paintFilterBackgroundImageData(newBGImage, oldBGImage) {
      console.log("background changed", newBGImage, oldBGImage);
      if (!oldBGImage && newBGImage) {
        // re-render if data has updated
        this.subs.data.sub(
          newBGImage.onModified(() => this.renderWindow.render())
        );
        this.paintFilter.setBackgroundImage(newBGImage);
      } else if (oldBGImage && !newBGImage) {
        this.paintFilter.setBackgroundImage(null);
        this.subs.data.unsubscribe();
      }
    },
    paintFilterLabelMapImageData(newLabelMap, oldLabelMap) {
      console.log("filter labels changed", newLabelMap, oldLabelMap);
      if (oldLabelMap !== newLabelMap && newLabelMap) {
        this.subs.labelmap.unsubscribe();

        const labelmapImageData = newLabelMap;
        const labelmap = createLabelPipeline(
          this.paintFilterBackgroundImageData,
          labelmapImageData
        );

        this.labelmap = labelmap;

        labelmap.mapper.setInputConnection(this.paintFilter.getOutputPort());

        // NOTE: You can update the labelmap externally just by calling modified()
        this.paintFilter.setLabelMap(labelmapImageData);
        this.subs.labelmap.sub(
          labelmapImageData.onModified(() => {
            labelmap.mapper.modified();

            this.renderWindow.render();
          })
        );
      }
    },
    painting(newPainting, oldPainting) {
      console.log("painting changed", newPainting, oldPainting);
      if (oldPainting !== newPainting) {
        if (newPainting) {
          this.viewWidget = this.widgetManager.addWidget(
            this.paintWidget,
            ViewTypes.VOLUME
          );
          this.subs.paintStart.sub(
            this.viewWidget.onStartInteractionEvent(() => {
              this.paintFilter.startStroke();
              this.paintFilter.addPoint(
                this.paintWidget.getWidgetState().getTrueOrigin()
              );
              if (this.onPaintStart) {
                this.onPaintStart();
              }
            })
          );
          this.subs.paint.sub(
            this.viewWidget.onInteractionEvent(() => {
              if (this.viewWidget.getPainting()) {
                this.paintFilter.addPoint(
                  this.paintWidget.getWidgetState().getTrueOrigin()
                );
                if (this.onPaint) {
                  this.onPaint();
                }
              }
            })
          );
          this.subs.paintEnd.sub(
            this.viewWidget.onEndInteractionEvent(() => {
              this.paintFilter.endStroke();
              if (this.onPaintEnd) {
                this.onPaintEnd();
              }
            })
          );

          this.widgetManager.grabFocus(this.paintWidget);
          this.widgetManager.enablePicking();
        } else if (this.viewWidget) {
          this.widgetManager.releaseFocus();
          this.widgetManager.removeWidget(this.paintWidget);
          this.widgetManager.disablePicking();

          this.subs.paintStart.unsubscribe();
          this.subs.paint.unsubscribe();
          this.subs.paintEnd.unsubscribe();
          this.viewWidget = null;
        }
      }
    }
  },
  computed: {
    voi() {
      // TODO: update this with actual view's/volume's values
      console.log("computing voi", getVOI(this.volumes[0]));
      return getVOI(this.volumes[0]);
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
    const oglrw = this.genericRenderWindow.getOpenGLRenderWindow();

    // add paint renderer
    this.paintRenderer = vtkRenderer.newInstance();
    this.renderWindow.addRenderer(this.paintRenderer);
    this.renderWindow.setNumberOfLayers(2);
    this.paintRenderer.setLayer(1);
    this.paintRenderer.setInteractive(false);

    // update view node tree so that vtkOpenGLHardwareSelector can access
    // the vtkOpenGLRenderer instance.
    oglrw.buildPass(true);

    const istyle = vtkInteractorStyleMPRSlice.newInstance();
    const inter = this.renderWindow.getInteractor();
    inter.setInteractorStyle(istyle);

    const updateCameras = () => {
      const baseCamera = this.renderer.getActiveCamera();
      const paintCamera = this.paintRenderer.getActiveCamera();

      const position = baseCamera.getReferenceByName('position');
      const focalPoint = baseCamera.getReferenceByName('focalPoint');
      const viewUp = baseCamera.getReferenceByName('viewUp');
      const viewAngle = baseCamera.getReferenceByName('viewAngle');

      paintCamera.set({
        position,
        focalPoint,
        viewUp,
        viewAngle,
      });
    };
    // unsubscribe from this before component unmounts.
    this.subs.interactor.sub(inter.onAnimation(updateCameras));

    updateCameras();

    this.widgetManager.disablePicking();
    this.widgetManager.setRenderer(this.paintRenderer);
    this.paintWidget = vtkPaintWidget.newInstance();
    this.paintWidget.setRadius(radius);
    this.paintFilter = vtkPaintFilter.newInstance();
    this.paintFilter.setLabel(label);
    this.paintFilter.setRadius(radius);

    // must be added AFTER the data volume is added so that this can be rendered in front
    if (this.labelmap && this.labelmap.actor) {
      this.renderer.addVolume(this.labelmap.actor);
    }

    if (this.actors) {
      actors = actors.concat(this.actors);
    }

    if (this.labelmap && this.labelmap.actor) {
      actors = actors.concat(this.labelmap.actor);
    }

    if (this.volumes) {
      volumes = volumes.concat(this.volumes);
    }

    filters = [this.paintFilter];
    widgets = [this.paintWidget];

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
    TODO: Use for maintaining clipping range for MIP

    const interactor = this.renderWindow.getInteractor();
    //const clippingRange = renderer.getActiveCamera().getClippingRange();

    interactor.onAnimation(() => {
      renderer.getActiveCamera().setClippingRange(...r);
    });*/

    //  TODO: assumes the volume is always set for this mounted state...Throw an error?
    const istyleVolumeMapper =
      this.interactorStyleVolumeMapper || this.volumes[0].getMapper();

    istyle.setVolumeMapper(istyleVolumeMapper);
    // istyle.setSliceNormal([0, 0, 1]);

    //start with the middle slice
    const range = istyle.getSliceRange();
    istyle.setSlice((range[0] + range[1]) / 2);

    istyle.onModified(() => {
      this.updatePaintbrush();
    });
    this.updatePaintbrush();

    // add the current volumes to the vtk renderer
    this.updateVolumesForRendering(this.volumes);

    this.updateSlicePlane()

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

const getVOI = actor => {
  // Note: This controls window/level

  // TODO: Make this work reactively with onModified...
  const rgbTransferFunction = actor.getProperty().getRGBTransferFunction(0);
  const range = rgbTransferFunction.getMappingRange();
  const windowWidth = range[0] + range[1];
  const windowCenter = range[0] + windowWidth / 2;

  return {
    windowCenter,
    windowWidth
  };
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

<template>
  <div v-if="volumes && volumes.length" class="viewer2d">
    <div ref="container" class="container2d" />
    <ViewportOverlay v-bind="dataDetails" :voi="voi" />
  </div>
</template>

<script>
import vtkGenericRenderWindow from "vtk.js/Sources/Rendering/Misc/GenericRenderWindow";
import vtkWidgetManager from "vtk.js/Sources/Widgets/Core/WidgetManager";
import vtkImageData from "vtk.js/Sources/Common/DataModel/ImageData";
import vtkDataArray from "vtk.js/Sources/Common/Core/DataArray";
import vtkVolume from "vtk.js/Sources/Rendering/Core/Volume";
import vtkVolumeMapper from "vtk.js/Sources/Rendering/Core/VolumeMapper";
//import vtkInteractorStyleMPRSlice from 'vtk.js/Sources/Interaction/Style/InteractorStyleMPRSlice';
import vtkInteractorStyleMPRSlice from "./vtkInteractorStyleMPRSlice.js";
import vtkPaintFilter from "vtk.js/Sources/Filters/General/PaintFilter";
import vtkPaintWidget from "vtk.js/Sources/Widgets/Widgets3D/PaintWidget";
import vtkColorTransferFunction from "vtk.js/Sources/Rendering/Core/ColorTransferFunction";
import vtkPiecewiseFunction from "vtk.js/Sources/Common/DataModel/PiecewiseFunction";
import { ViewTypes } from "vtk.js/Sources/Widgets/Core/WidgetManager/Constants";

import { createSub } from "../lib/createSub.js";

import ViewportOverlay from "../ViewportOverlay/ViewportOverlay.vue";

export default {
  name: "view-2d",
  components: { ViewportOverlay },
  props: {
    volumes: { type: Array, required: true },
    actors: Array,
    painting: { type: Boolean, default: false },
    paintFilterBackgroundImageData: Object,
    paintFilterLabelMapImageData: Object,
    onPaint: Function,
    onPaintStart: Function,
    onPaintEnd: Function,
    interactorStyleVolumeMapper: Object,
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
      const camera = this.renderer.getActiveCamera();
      manip.setNormal(...camera.getDirectionOfProjection());
      manip.setOrigin(...camera.getFocalPoint());
    },
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
    let actors = [];
    let volumes = [];

    const radius = 5;
    const label = 1;

    this.renderer = this.genericRenderWindow.getRenderer();
    this.renderWindow = this.genericRenderWindow.getRenderWindow();

    const istyle = vtkInteractorStyleMPRSlice.newInstance();
    this.istyle = istyle;
    this.renderWindow.getInteractor().setInteractorStyle(istyle);

    this.widgetManager.setRenderer(this.renderer);
    this.paintWidget = vtkPaintWidget.newInstance();
    this.paintWidget.setRadius(radius);
    this.paintFilter = vtkPaintFilter.newInstance();
    this.paintFilter.setLabel(label);
    this.paintFilter.setRadius(radius);

    // trigger pipeline update
    // this.componentDidUpdate({});

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

    const istyleVolumeMapper =
      this.interactorStyleVolumeMapper || this.volumes[0].getMapper();

    istyle.setVolumeMapper(istyleVolumeMapper);
    istyle.setSliceNormal(0, 0, 1);
    const range = istyle.getSliceRange();
    istyle.setSlice((range[0] + range[1]) / 2);

    istyle.onModified(() => {
      this.updatePaintbrush();
    });
    this.updatePaintbrush();

    // TODO: Not sure why this is necessary to force the initial draw
    this.genericRenderWindow.resize();

    if (this.onCreated) {
      console.log(
        "calling onCreated when View2d was mounted",
        this.$refs.container
      );
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
        actors,
        volumes,
        _component: this
      };

      this.onCreated(api);
    }
  },
  watch: {
    volumes(newVolumes) {
      newVolumes.forEach(volume => {
        if (!volume.isA("vtkVolume")) {
          console.warn("Data to <Vtk2D> is not vtkVolume data");
        }
        this.renderer.addVolume(volume);
      });
      this.renderWindow.render();
    },
    paintFilterBackgroundImageData(newBGImage, oldBGImage) {
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
      if (oldLabelMap !== newLabelMap && newLabelMap) {
        this.subs.labelmap.unsubscribe();

        const labelmapImageData = newLabelMap;
        const labelmap = createLabelPipeline(
          this.paintFilterBackgroundImageData,
          labelmapImageData
        );

        this.labelmap = labelmap;

        labelmap.mapper.setInputConnection(this.paintFilter.getOutputPort());

        // You can update the labelmap externally just by calling modified()
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
      return getVOI(this.volumes[0]);
    }
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

// TODO: mostly duplicated in view3d...
function createLabelPipeline(
  backgroundImageData,
  paintFilterLabelMapImageData
) {
  let labelMapData;

  if (paintFilterLabelMapImageData) {
    labelMapData = paintFilterLabelMapImageData;
  } else {
    // Create a labelmap image the same dimensions as our background volume.
    labelMapData = vtkImageData.newInstance(
      backgroundImageData.get("spacing", "origin", "direction")
    );
    labelMapData.setDimensions(backgroundImageData.getDimensions());
    labelMapData.computeTransforms();

    const values = new Uint8Array(backgroundImageData.getNumberOfPoints());
    const dataArray = vtkDataArray.newInstance({
      numberOfComponents: 1, // labelmap with single component
      values
    });
    labelMapData.getPointData().setScalars(dataArray);
  }

  const labelMap = {
    actor: vtkVolume.newInstance(),
    mapper: vtkVolumeMapper.newInstance(),
    cfun: vtkColorTransferFunction.newInstance(),
    ofun: vtkPiecewiseFunction.newInstance()
  };

  // labelmap pipeline
  labelMap.actor.setMapper(labelMap.mapper);

  // set up labelMap color and opacity mapping
  labelMap.cfun.addRGBPoint(1, 0, 0, 1); // label "1" will be blue
  labelMap.cfun.addRGBPoint(0, 1, 0, 2); // label "1" will be blue
  labelMap.cfun.addRGBPoint(0, 0, 1, 3); // label "1" will be blue
  labelMap.ofun.addPoint(0, 0);
  labelMap.ofun.addPoint(1, 0.5);

  labelMap.actor.getProperty().setRGBTransferFunction(0, labelMap.cfun);
  labelMap.actor.getProperty().setScalarOpacity(0, labelMap.ofun);
  labelMap.actor.getProperty().setInterpolationTypeToNearest();

  return labelMap;
}

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

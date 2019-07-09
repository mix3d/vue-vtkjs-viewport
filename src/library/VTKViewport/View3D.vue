<template>
  <div v-if="volumes && volumes.length" class="viewer3d">
    <div ref="container" class="container3d" />
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
//import vtkInteractorStyleMPRSlice from 'vtk.js/Sources/Interaction/Style/InteractorStyleMPRSlice'
// import vtkInteractorStyleMPRSlice from './vtkInteractorStyleMPRSlice.js';
import vtkPaintFilter from "vtk.js/Sources/Filters/General/PaintFilter";
import vtkPaintWidget from "vtk.js/Sources/Widgets/Widgets3D/PaintWidget";
import vtkColorTransferFunction from "vtk.js/Sources/Rendering/Core/ColorTransferFunction";
import vtkPiecewiseFunction from "vtk.js/Sources/Common/DataModel/PiecewiseFunction";

import ViewportOverlay from "../ViewportOverlay/ViewportOverlay.vue";
import { ViewTypes } from "vtk.js/Sources/Widgets/Core/WidgetManager/Constants";
import { createSub } from "../lib/createSub.js";

// TODO: mostly duplicated in view2d...
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
  labelMap.cfun.addRGBPoint(2, 1, 0, 0); // label "2" will be red
  labelMap.cfun.addRGBPoint(3, 0, 1, 0); // label "3" will be green

  labelMap.ofun.addPoint(0, 0);
  labelMap.ofun.addPoint(1, 0.5);

  labelMap.actor.getProperty().setRGBTransferFunction(0, labelMap.cfun);
  labelMap.actor.getProperty().setScalarOpacity(0, labelMap.ofun);
  labelMap.actor.getProperty().setInterpolationTypeToNearest();

  return labelMap;
}

export default {
  components: { ViewportOverlay },
  props: {
    volumes: Array,
    actors: Array,
    painting: {
      type: Boolean,
      default: false
    },
    paintFilterBackgroundImageData: Object,
    paintFilterLabelMapImageData: Object,
    onPaint: Function,
    onPaintStart: Function,
    onPaintEnd: Function,
    sliceNormal: { type: Array, default: () => [0, 0, 1] },
    dataDetails: Object,
    onCreated: Function,
    onDestroyed: Function
  },

  created() {
    // non-reactive variables
    this.genericRenderWindow = null;
    this.widgetManager = vtkWidgetManager.newInstance();
  },

  data() {
    return {
      subs: {
        interactor: createSub(),
        data: createSub(),
        labelmap: createSub(),
        paint: createSub(),
        paintStart: createSub(),
        paintEnd: createSub()
      }
    };
  },
  methods: {
    updateVolumesForRendering(volumes) {
      volumes &&
        volumes.forEach(volume => {
          if (!volume.isA("vtkVolume")) {
            console.warn("Data to <Vtk2D> is not vtkVolume data");
          }
          this.renderer.addVolume(volume);
        });
      this.renderWindow.render();
    }
  },
  mounted() {
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

    this.widgetManager.setRenderer(this.renderer);
    this.paintWidget = vtkPaintWidget.newInstance();
    this.paintWidget.setRadius(radius);
    this.paintFilter = vtkPaintFilter.newInstance();
    this.paintFilter.setLabel(label);
    this.paintFilter.setRadius(radius);

    // trigger pipeline update
    // this.componentDidUpdate({});

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

    // must be added AFTER the data volume is added so that this can be rendered in front
    if (this.labelmap && this.labelmap.actor) {
      this.renderer.addVolume(this.labelmap.actor);
    }

    // add the current volumes to the vtk renderer
    this.updateVolumesForRendering(this.volumes);

    this.renderer.resetCamera();
    const camera = this.renderer.getActiveCamera();
    console.log(camera);
    // camera.setViewUp([0, 0, 1]);
    this.renderer.updateLightsGeometryToFollowCamera();

    // TODO: Not sure why this is necessary to force the initial draw
    this.genericRenderWindow.resize();

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
        actors,
        volumes,
        _component: this
      };

      this.onCreated(api);
    }
  },
  computed: {
    voi() {
      let voi = {
        windowCenter: 0,
        windowWidth: 0
      };

      if (this.pipeline) {
        const actor = this.volumes[0];

        // Note: This controls window/level
        const rgbTransferFunction = actor
          .getProperty()
          .getRGBTransferFunction(0);
        const range = rgbTransferFunction.getMappingRange();
        const windowWidth = range[0] + range[1];
        const windowCenter = range[0] + windowWidth / 2;

        voi = {
          windowCenter,
          windowWidth
        };
      }
      return voi;
    }
  },
  watch: {
    volumes(newVolumes, prevVolumes) {
      if (prevVolumes !== newVolumes) {
        this.updateVolumesForRendering(newVolumes);
      }
    },
    actors(newActors, prevActors) {
      if (prevActors !== newActors && newActors) {
        newActors.forEach(actor => {
          if (!actor.isA("vtkActor")) {
            console.warn("Data to <Vtk2D> is not vtkActor data");
          }
        });

        if (newActors.length) {
          newActors.forEach(this.renderer.addActor);
        } else {
          // TODO: Remove all actors
        }
        this.renderWindow.render();
      }
    },
    paintFilterBackgroundImageData(newPaint, prevPaint) {
      if (!prevPaint && newPaint) {
        // re-render if data has updated
        this.subs.data.sub(
          newPaint.onModified(() => this.renderWindow.render())
        );
        this.paintFilter.setBackgroundImage(newPaint);
      } else if (prevPaint && !newPaint) {
        this.paintFilter.setBackgroundImage(null);
        this.subs.data.unsubscribe();
      }
    },
    paintFilterLabelMapImageData(newLabel, prevLabel) {
      if (prevLabel !== newLabel && newLabel) {
        this.subs.labelmap.unsubscribe();

        const labelmapImageData = newLabel;
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
    painting(newPainting, prevPainting) {
      if (prevPainting !== newPainting) {
        if (newPainting) {
          console.time("turnOnPainting");
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
          console.timeEnd("turnOnPainting");
        } else if (this.viewWidget) {
          console.time("turnOffPainting");
          this.widgetManager.releaseFocus();
          this.widgetManager.removeWidget(this.paintWidget);
          this.widgetManager.disablePicking();

          this.subs.paintStart.unsubscribe();
          this.subs.paint.unsubscribe();
          this.subs.paintEnd.unsubscribe();
          this.viewWidget = null;
          console.timeEnd("turnOffPainting");
        }
      }
    }
  },

  beforeDestroy() {
    Object.keys(this.subs).forEach(k => {
      this.subs[k].unsubscribe();
    });

    if (this.onDestroyed) {
      this.onDestroyed();
    }
  }
};
</script>

<style lang="scss">
.viewer3d {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>

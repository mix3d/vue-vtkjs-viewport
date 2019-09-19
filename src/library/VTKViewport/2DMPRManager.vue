<template>
  <div class="row" v-if="initialized">
    <div class="col" v-for="(view, key) in viewData" :key="key">
      <view-2d-mpr
        :volumes="volumes"
        :sliceIntersection="sliceIntersection"
        :views="viewData"
        :onCreated="saveComponentRefGenerator(key)"
        :index="key"
        @rotate="onRotate"
        @thickness="onThickness"
      />
    </div>
  </div>
</template>

<script>

/**
 * Component emits the following, to tell the parent to update the `viewData` object
 * @emits "rotate"
 * @emits "thickness"
 * @emits "activity"
 * @emits "windowLevels"
 */

import vtkCoordinate from "vtk.js/Sources/Rendering/Core/Coordinate";
import vtkMatrixBuilder from "vtk.js/Sources/Common/Core/MatrixBuilder";
import vtkVolume from "vtk.js/Sources/Rendering/Core/Volume";
import vtkVolumeMapper from "vtk.js/Sources/Rendering/Core/VolumeMapper";

import View2dMPR from "./2DMPRView.vue";
import vtkInteractorStyleMPRCrosshairs from "./vtkInteractorStyleMPRCrosshairs";
import vtkInteractorStyleMPRWindowLevel from "./vtkInteractorStyleMPRWindowLevel";
import getPlaneIntersection from "../lib/math/planeIntersections";
import { toWindowLevel } from "../lib/windowLevelRangeConverter";

import { FRONT, TOP, LEFT, LEVEL_TOOL, SELECT_TOOL, BLEND_NONE, BLEND_MIP } from "./consts";

export default {
  components: {
    "view-2d-mpr": View2dMPR
  },
  props: {
    activeTool: {
      type: String,
      default: LEVEL_TOOL
    },
    syncWindowLevels: {
      type: Boolean,
      default: false
    },
    windowLevelScale: {
      type: Number,
      default: 5
    },
    volumeData: {
      type: Object,
      required: true
    },
    sampleDistance: {
      type: Number,
      default: 1
    },
    // the parent of this component will need to handle events that change these values
    // the structure of this viewData is very important.
    viewData: {
      type: Object,
      default: () => ({
        [TOP]: {
          color: "#F8B42C",
          slicePlaneNormal: [0, 0, 1],
          sliceViewUp: [0, -1, 0],
          slicePlaneXRotation: 0,
          slicePlaneYRotation: 0,
          viewRotation: 0,
          sliceThickness: 0.1,
          blendMode: BLEND_NONE,
          window: {
            width: 0,
            center: 0
          },
          active: false
        },
        [LEFT]: {
          color: "#A62CF8",
          slicePlaneNormal: [1, 0, 0],
          sliceViewUp: [0, 0, -1],
          slicePlaneXRotation: 0,
          slicePlaneYRotation: 0,
          viewRotation: 0,
          sliceThickness: 0.1,
          blendMode: BLEND_NONE,
          window: {
            width: 0,
            center: 0
          },
          active: false
        },
        [FRONT]: {
          color: "#2C92F8",
          slicePlaneNormal: [0, -1, 0],
          sliceViewUp: [0, 0, -1],
          slicePlaneXRotation: 0,
          slicePlaneYRotation: 0,
          viewRotation: 0,
          sliceThickness: 0.1,
          blendMode: BLEND_NONE,
          window: {
            width: 0,
            center: 0
          },
          active: false
        }
      })
    }
  },
  data() {
    return {
      // Holds the volumeActors that hold the volume data
      volumes: [],
      // Holds the data from each of the 2dMPRViews
      components: [],
      sliceIntersection: [0, 0, 0],
      initialized: false,
    };
  },
  computed: {},
  watch: {
    activeTool(tool) {
      // Switch the active interactor style.
      // TODO:
      switch (tool) {
        case LEVEL_TOOL:
          Object.entries(this.components).forEach(this.setLevelTool);
          break;
        case SELECT_TOOL:
          Object.entries(this.components).forEach(this.setCrosshairTool);
          break;
      }
    }
  },
  methods: {
    setLevelTool([viewportIndex, component]) {
      const istyle = vtkInteractorStyleMPRWindowLevel.newInstance();
      istyle.setOnScroll(() => this.onScrolled(viewportIndex));
      istyle.setOnLevelsChanged(levels => {
        this.updateLevels({ ...levels, index: viewportIndex });
      });
      istyle.setLevelScale(this.windowLevelScale)
      setInteractor(component, istyle);
    },
    setCrosshairTool([viewportIndex, component]) {
      const istyle = vtkInteractorStyleMPRCrosshairs.newInstance();
      istyle.setOnScroll(() => this.onScrolled(viewportIndex));
      istyle.setOnClickCallback(({ worldPos }) =>
        this.onCrosshairPointSelected({ worldPos, index: viewportIndex })
      );
      setInteractor(component, istyle);
    },
    onRotate(index, axis, angle) {
      // Match the source axis to the associated plane
      const data = { index: "", plane: "", angle };
      switch (index) {
        case TOP:
          if (axis === "x") {
            data.index = FRONT;
            data.plane = "y";
          } else if (axis === "y") {
            data.index = LEFT;
            data.plane = "y";
          }
          break;
        case LEFT:
          if (axis === "x") {
            data.index = TOP;
            data.plane = "x";
          } else if (axis === "y") {
            data.index = FRONT;
            data.plane = "x";
          }
          break;
        case FRONT:
          if (axis === "x") {
            data.index = TOP;
            data.plane = "y";
          } else if (axis === "y") {
            data.index = LEFT;
            data.plane = "x";
          }
          break;
      }
      this.$emit("rotate", data);
      this.$emit("activity", index);
    },
    onThickness(index, axis, thickness) {
      const data = { index: "", thickness };
      switch (index) {
        case "top":
          if (axis === "x") data.index = FRONT;
          else if (axis === "y") data.index = LEFT;
          break;
        case "left":
          if (axis === "x") data.index = TOP;
          else if (axis === "y") data.index = FRONT;
          break;
        case "front":
          if (axis === "x") data.index = TOP;
          else if (axis === "y") data.index = LEFT;
          break;
      }
      this.$emit("thickness", data);
      this.$emit("activity", index);

      //TODO: add logic to the vuex handler that:
      // if (thickness >= 1 && view.blendMode === BLEND_NONE) view.blendMode = BLEND_MIP;
      // else if(!shouldBeMIP) {
      //   view.blendMode = "none"
      // }
    },
    onScrolled(index) {
      let planes = [];
      Object.values(this.components).forEach(component => {
        const camera = component.genericRenderWindow
          .getRenderer()
          .getActiveCamera();

        planes.push({
          position: camera.getFocalPoint(),
          normal: camera.getDirectionOfProjection()
        });
      });
      const newPoint = getPlaneIntersection(...planes);
      if (!Number.isNaN(newPoint)) {
        this.sliceIntersection = newPoint;
      }
      // on resize we don't get an index
      if (index) this.$emit("activity", index);
    },
    onCrosshairPointSelected({ index, worldPos }) {
      Object.entries(this.components)
        .filter(([key]) => key !== index)
        .forEach(([viewportIndex, component]) => {
          // We are basically doing the same as getSlice but with the world coordinate
          // that we want to jump to instead of the camera focal point.
          // I would rather do the camera adjustment directly but I keep
          // doing it wrong and so this is good enough for now.
          // ~ swerik
          const renderWindow = component.genericRenderWindow.getRenderWindow();

          const istyle = renderWindow.getInteractor().getInteractorStyle();
          const sliceNormal = istyle.getSliceNormal();
          const transform = vtkMatrixBuilder
            .buildFromDegree()
            .identity()
            .rotateFromDirections(sliceNormal, [1, 0, 0]);

          const mutatedWorldPos = worldPos.slice();
          transform.apply(mutatedWorldPos);
          const slice = mutatedWorldPos[0];

          istyle.setSlice(slice);

          renderWindow.render();
        });
      this.$emit("activity", index);
    },
    updateLevels({ index, windowCenter, windowWidth }) {
      this.$emit("windowLevels", { index, windowCenter, windowWidth });
      this.$emit("activity", index);

      if (this.syncWindowLevels) {
        Object.entries(this.components)
          .filter(([key]) => key !== index)
          .forEach(([key, component]) => {
            // this[key].windowCenter = windowCenter;
            // this[key].windowWidth = windowWidth;
            component.genericRenderWindow
              .getInteractor()
              .getInteractorStyle()
              .setWindowLevel(windowWidth, windowCenter);
            component.genericRenderWindow.getRenderWindow().render();
            this.$emit("windowLevels", { index:key, windowCenter, windowWidth });
          });
      }
    },
    saveComponentRefGenerator(viewportIndex) {
      // generate a function that captures references to the given view component, keeping the index scope
      return component => {
        this.components[viewportIndex] = component;
        // default to the level tool
        this.setLevelTool([viewportIndex, component]);
      };
    },
    init() {
      const volumeActor = vtkVolume.newInstance();
      const volumeMapper = vtkVolumeMapper.newInstance();

      volumeMapper.setSampleDistance(this.sampleDistance);
      volumeActor.setMapper(volumeMapper);

      volumeMapper.setInputData(this.volumeData);

      const initialRange = this.volumeData
        .getPointData()
        .getScalars()
        .getRange();

      // TODO: Keybind values that set the mapping range
      const rgbTransferFunction = volumeActor
        .getProperty()
        .getRGBTransferFunction(0);
      rgbTransferFunction.setMappingRange(...initialRange);

      const { windowWidth, windowCenter } = getVOI(volumeActor);

      Object.entries(this.viewData).forEach(([index, view]) => {
        this.$emit("windowLevels", { index, windowWidth, windowCenter });
      });

      // TODO: Refactor the MPR slice to set the focal point instead of defaulting to volume center
      this.sliceIntersection = getVolumeCenter(volumeMapper);
      this.volumes = [volumeActor];
      this.initialized = true;
    }
  },
  mounted() {
    this.resizeFunction = () => {
      // not enough time between resize event and the right data coming through it seems.
      window.setTimeout(() => {
        this.onScrolled();
      }, 10);
    };
    // update intersection point when window resizes
    window.addEventListener("resize", this.resizeFunction);
    this.init();
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.resizeFunction);
  }
};

function setInteractor(component, istyle) {
  const renderWindow = component.genericRenderWindow.getRenderWindow();
  // We are assuming the old style is always extended from the MPRSlice style
  const oldStyle = renderWindow.getInteractor().getInteractorStyle();

  renderWindow.getInteractor().setInteractorStyle(istyle);
  // NOTE: react-vtk-viewport's code put this here, so we're copying it. Seems redundant?
  istyle.setInteractor(renderWindow.getInteractor());

  // Make sure to set the style to the interactor itself, because reasons...?!
  const inter = renderWindow.getInteractor();
  inter.setInteractorStyle(istyle);

  // Copy previous interactors styles into the new one.
  if (istyle.setSliceNormal && oldStyle.getSliceNormal()) {
    // console.log("setting slicenormal from old normal");
    istyle.setSliceNormal(oldStyle.getSliceNormal(), oldStyle.getViewUp());
  }
  if (istyle.setSlabThickness && oldStyle.getSlabThickness()) {
    istyle.setSlabThickness(oldStyle.getSlabThickness());
  }
  istyle.setVolumeMapper(component.volumes[0]);
  renderWindow.render();
}

function getVolumeCenter(volumeMapper) {
  const bounds = volumeMapper.getBounds();
  return [
    (bounds[0] + bounds[1]) / 2.0,
    (bounds[2] + bounds[3]) / 2.0,
    (bounds[4] + bounds[5]) / 2.0
  ];
}

const getVOI = volume => {
  // Note: This controls window/level

  // TODO: Make this work reactively with onModified...
  const rgbTransferFunction = volume.getProperty().getRGBTransferFunction(0);
  const range = rgbTransferFunction.getMappingRange();
  const windowWidth = range[0] + range[1];
  const windowCenter = range[0] + windowWidth / 2;

  return {
    windowCenter,
    windowWidth
  };
};
</script>

<style scoped>
.row {
  display: flex;
  flex-direction: row;
  /* max-height: 600px; */
  padding: 2px;
  background: #000;
}
.col {
  flex: 1;
}
.col + .col {
  margin-left: 2px;
}
.viewer2d {
/* TODO: any needed styles to override the childred */
}

</style>

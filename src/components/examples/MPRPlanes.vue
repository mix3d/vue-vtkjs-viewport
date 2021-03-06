<template>
  <div>
    <h2>MPR Planes</h2>
    <p>Attempts at final integration of MPR with all the bells and whistles.</p>
    <select v-model="selectedFile">
      <option v-for="file in files" :key="file">{{ file }}</option>
    </select>
    <hr />
    <div v-if="loading">
      <h3>Loading...</h3>
    </div>
    <div v-else>
      <div>
        <button @click="selectTool('LEVEL')" :class="{ active: activeTool === 'LEVEL' }">
          <img src="https://img.icons8.com/material-rounded/344/contrast.png" />
          Level
        </button>
        <button @click="selectTool('SELECT')" :class="{ active: activeTool === 'SELECT' }">
          <img src="https://img.icons8.com/material/344/define-location.png" />
          Select
        </button>
        <p>
          <input type="checkbox" id="checkbox" v-model="syncWindowLevels" />
          <label for="checkbox">Sync Window Leveling</label>
        </p>
        <p>Intersect point: {{sliceIntersection}}</p>
      </div>
      <div class="row">
        <div class="col" v-for="(view, key) in viewDataArray" :key="key">
          <table style="background: white; margin: 10px; border-radius: 6px; padding: 4px;">
            <tr>
              <td>
                <strong>{{ key }}</strong>
              </td>
            </tr>
            <tr>
              <td>Rotate SlicePlane X</td>
              <td>
                <input
                  class="rotate"
                  type="range"
                  min="-89"
                  max="89"
                  step="1"
                  v-model.number="view.slicePlaneXRotation"
                />
                <span>{{ view.slicePlaneXRotation }}&deg;</span>
              </td>
            </tr>
            <tr>
              <td>Rotate SlicePlane Y</td>
              <td>
                <input
                  class="rotate"
                  type="range"
                  min="-89"
                  max="89"
                  step="1"
                  v-model.number="view.slicePlaneYRotation"
                />
                <span>{{ view.slicePlaneYRotation }}&deg;</span>
              </td>
            </tr>
            <tr>
              <td>Rotate View</td>
              <td>
                <input type="radio" :id="`${key}1rot`" :value="0" v-model="view.viewRotation" />
                <label :for="`${key}1rot`">0&deg;</label>

                <input type="radio" :id="`${key}2rot`" :value="90" v-model="view.viewRotation" />
                <label :for="`${key}2rot`">90&deg;</label>

                <input type="radio" :id="`${key}3rot`" :value="180" v-model="view.viewRotation" />
                <label :for="`${key}3rot`">180&deg;</label>

                <input type="radio" :id="`${key}4rot`" :value="270" v-model="view.viewRotation" />
                <label :for="`${key}4rot`">270&deg;</label>
              </td>
            </tr>
            <tr>
              <td>Slice Thickness</td>
              <td>
                <input
                  class="rotate"
                  type="range"
                  min="0.1"
                  max="50"
                  step=".1"
                  v-model.number="view.sliceThickness"
                />
                <span>{{ view.sliceThickness }}</span>
              </td>
            </tr>
            <tr>
              <td>Blend Mode</td>
              <td>
                <input type="radio" :id="`${key}1blend`" value="none" v-model="view.blendMode" />
                <label :for="`${key}1blend`">None</label>

                <input type="radio" :id="`${key}2blend`" value="MIP" v-model="view.blendMode" />
                <label :for="`${key}2blend`">MIP</label>

                <input type="radio" :id="`${key}3blend`" value="MINIP" v-model="view.blendMode" />
                <label :for="`${key}3blend`">MinIP</label>

                <input type="radio" :id="`${key}4blend`" value="AVG" v-model="view.blendMode" />
                <label :for="`${key}4blend`">Average</label>
              </td>
            </tr>
          </table>

          <view-2d-mpr
            :volumes="volumes"
            :sliceIntersection="sliceIntersection"
            :views="viewDataArray"
            :onCreated="saveComponentRefGenerator(key)"
            :index="key"
            @rotate="onRotate"
            @thickness="onThickness"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  View2dMPR,
  vtkInteractorStyleMPRCrosshairs,
  vtkInteractorStyleMPRWindowLevel,
} from "@/library";

import vtkHttpDataSetReader from "vtk.js/Sources/IO/Core/HttpDataSetReader";
import vtkVolume from "vtk.js/Sources/Rendering/Core/Volume";
import vtkVolumeMapper from "vtk.js/Sources/Rendering/Core/VolumeMapper";

import vtkMatrixBuilder from "vtk.js/Sources/Common/Core/MatrixBuilder";
import vtkCoordinate from "vtk.js/Sources/Rendering/Core/Coordinate";
// import vtkMath from "vtk.js/Sources/Common/Core/Math";
import vtkPlane from "vtk.js/Sources/Common/DataModel/Plane";

import { files } from "@/components/examples";

export default {
  components: {
    "view-2d-mpr": View2dMPR
  },
  data() {
    return {
      volumes: [],
      components: [],
      focusedWidgetId: null,
      activeTool: "LEVEL",
      loading: true,
      selectedFile: files[2],
      sliceIntersection: [0, 0, 0],
      // TODO: refactor into prop.
      syncWindowLevels: false,
      top: {
        color: "#F8B42C",
        slicePlaneNormal: [0, 0, 1],
        sliceViewUp: [0, -1, 0],
        slicePlaneXRotation: 0,
        slicePlaneYRotation: 0,
        viewRotation: 0,
        sliceThickness: 0.1,
        blendMode: "none",
        window: {
          width: 0,
          center: 0
        }
      },
      left: {
        color: "#A62CF8",
        slicePlaneNormal: [1, 0, 0],
        sliceViewUp: [0, 0, -1],
        slicePlaneXRotation: 0,
        slicePlaneYRotation: 0,
        viewRotation: 0,
        sliceThickness: 0.1,
        blendMode: "none",
        window: {
          width: 0,
          center: 0
        }
      },
      front: {
        color: "#2C92F8",
        slicePlaneNormal: [0, -1, 0],
        sliceViewUp: [0, 0, -1],
        slicePlaneXRotation: 0,
        slicePlaneYRotation: 0,
        viewRotation: 0,
        sliceThickness: 0.1,
        blendMode: "none",
        window: {
          width: 0,
          center: 0
        }
      }
    };
  },
  computed: {
    viewDataArray() {
      return { top: this.top, left: this.left, front: this.front };
    }
  },
  created() {
    // non-reactive data
    this.files = files;
  },
  watch: {
    selectedFile(newVal) {
      this.loadData(newVal);
    },
    window: {
      handler(newWindow) {
        this.updateColorWindow(newWindow.value);
      },
      deep: true
    },
    level: {
      handler(newLevel) {
        this.updateColorLevel(newLevel.value);
      },
      deep: true
    }
  },
  methods: {
    selectTool(tool) {
      this.activeTool = tool;
      // Switch the active interactor style.
      // TODO:
      switch (tool) {
        case "LEVEL":
          Object.entries(this.components).forEach(this.setLevelTool);
          break;
        case "SELECT":
          Object.entries(this.components).forEach(this.setCrosshairTool);
          break;
      }
    },
    setLevelTool([viewportIndex, component]) {
      const istyle = vtkInteractorStyleMPRWindowLevel.newInstance();
      istyle.setOnScroll(this.onScrolled);
      istyle.setOnLevelsChanged(levels => {
        this.updateLevels({ ...levels, index: viewportIndex });
      });
      setInteractor(component, istyle);
    },
    setCrosshairTool([viewportIndex, component]) {
      const istyle = vtkInteractorStyleMPRCrosshairs.newInstance();
      istyle.setOnScroll(this.onScrolled);
      istyle.setOnClickCallback(({ worldPos }) =>
        this.onCrosshairPointSelected({ worldPos, index: viewportIndex })
      );
      setInteractor(component, istyle);
    },
    onRotate(index, axis, angle) {
      // Match the source axis to the associated plane
      switch (index) {
        case "top":
          if (axis === "x") this.front.slicePlaneYRotation = angle;
          else if (axis === "y") this.left.slicePlaneYRotation = angle;
          break;
        case "left":
          if (axis === "x") this.top.slicePlaneXRotation = angle;
          else if (axis === "y") this.front.slicePlaneXRotation = angle;
          break;
        case "front":
          if (axis === "x") this.top.slicePlaneYRotation = angle;
          else if (axis === "y") this.left.slicePlaneXRotation = angle;
          break;
      }
    },
    onThickness(index, axis, thickness) {
      const shouldBeMIP = thickness > 1;
      let view;
      switch (index) {
        case "top":
          if (axis === "x") view = this.front;
          else if (axis === "y") view = this.left;
          break;
        case "left":
          if (axis === "x") view = this.top;
          else if (axis === "y") view = this.front;
          break;
        case "front":
          if (axis === "x") view = this.top;
          else if (axis === "y") view = this.left;
          break;
      }
      view.sliceThickness = thickness;
      // TODO: consts instead of magic strings
      if (shouldBeMIP && view.blendMode === "none") view.blendMode = "MIP";
      // else if(!shouldBeMIP) {
      //   view.blendMode = "none"
      // }
    },
    onScrolled() {
      let planes = [];
      Object.values(this.components).forEach(component => {
        const camera = component.genericRenderWindow
          .getRenderer()
          .getActiveCamera();

        planes.push({
          position: camera.getFocalPoint(),
          normal: camera.getDirectionOfProjection()
          // this[viewportIndex].slicePlaneNormal
        });
      });
      const newPoint = getPlaneIntersection(...planes);
      if (!Number.isNaN(newPoint)) {
        this.sliceIntersection = newPoint;
      }
    },
    onCrosshairPointSelected({ index, worldPos }) {
      Object.entries(this.components).forEach(([viewportIndex, component]) => {
        if (viewportIndex !== index) {
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
        }

        const renderer = component.genericRenderWindow.getRenderer();
        const wPos = vtkCoordinate.newInstance();
        wPos.setCoordinateSystemToWorld();
        wPos.setValue(worldPos);

        const displayPosition = wPos.getComputedDisplayValue(renderer);

      });
    },

    updateLevels({ windowCenter, windowWidth, index }) {
      this[index].window.center = windowCenter;
      this[index].window.width = windowWidth;

      if (this.syncWindowLevels) {
        Object.entries(this.components)
          .filter(([key]) => key !== index)
          .forEach(([key, component]) => {
            this[key].window.center = windowCenter;
            this[key].window.width = windowWidth;
            component.genericRenderWindow
              .getInteractor()
              .getInteractorStyle()
              .setWindowLevel(windowWidth, windowCenter);
            component.genericRenderWindow.getRenderWindow().render();
          });
      }
    },

    saveComponentRefGenerator(viewportIndex) {
      return component => {
        this.components[viewportIndex] = component;

        const { windowWidth, windowLevel } = getVOI(component.volumes[0]);

        // get initial window leveling
        this[viewportIndex].windowWidth = windowWidth;
        this[viewportIndex].windowLevel = windowLevel;

        const renderWindow = component.genericRenderWindow.getRenderWindow();
        const renderer = component.genericRenderWindow.getRenderer();

        renderWindow
          .getInteractor()
          .getInteractorStyle()
          .setVolumeMapper(null);

        // default to the level tool
        this.setLevelTool([viewportIndex, component]);

        renderWindow.render();
      };
    },

    rerenderAllViewports() {
      // Update all render windows, since the automatic re-render might not
      // happen if the viewport is not currently using the painting widget
      Object.values(this.components).forEach(component => {
        component.genericRenderWindow.getRenderWindow().render();
      });
    },
    loadData(fileString) {
      this.loading = true;
      const reader = vtkHttpDataSetReader.newInstance({
        fetchGzip: true
      });
      const volumeActor = vtkVolume.newInstance();
      const volumeMapper = vtkVolumeMapper.newInstance();
      volumeMapper.setSampleDistance(1);

      volumeActor.setMapper(volumeMapper);

      reader
        .setUrl(`/${fileString || this.selectedFile}`, { loadData: true })
        .then(() => {
          const data = reader.getOutputData();
          volumeMapper.setInputData(data);

          // FIXME: custom range mapping
          const rgbTransferFunction = volumeActor
            .getProperty()
            .getRGBTransferFunction(0);
          rgbTransferFunction.setMappingRange(500, 3000);

          Object.values(this.viewDataArray).forEach(view => {
            view.window.center = 500;
            view.window.width = 3000;
          });

          // update slice min/max values for interface
          // Crate imageMapper for I,J,K planes
          // const dataRange = data
          //   .getPointData()
          //   .getScalars()
          //   .getRange();
          // const extent = data.getExtent();
          // this.window = {
          //   min: 0,
          //   max: dataRange[1] * 2,
          //   value: dataRange[1]
          // };
          // this.level = {
          //   min: -dataRange[1],
          //   max: dataRange[1],
          //   value: (dataRange[0] + dataRange[1]) / 2
          // };
          // this.updateColorLevel();
          // this.updateColorWindow();

          // TODO: find the volume center and set that as the slice intersection point.
          // TODO: Refactor the MPR slice to set the focal point instead of defaulting to volume center
          this.sliceIntersection = getVolumeCenter(volumeMapper);
          this.volumes = [volumeActor];
          this.loading = false;
        });
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
    this.loadData();
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
}

//TODO: Unused, actually implement it!
// function generateStackScrollCallbackForIndex(windows, index) {
//   return ({ worldPos }) => {
//     windows.forEach((window, viewportIndex) => {
//       if (viewportIndex !== index) {
//         const renderWindow = window.genericRenderWindow.getRenderWindow();
//         const istyle = renderWindow.getInteractor.getInteractorStyle();
//         const sliceNormal = istyle.getSliceNormal();
//       }
//     });
//   };
// }

/**
 * Function Generator for updating the other views when clicking the crosshair tool
 */
// function generateCrosshairCallbackForIndex(windows, index) {
//   return ({ worldPos }) => {
//     console.log("getting crosshair coords", windows, index);
//     // Set camera focal point to world coordinate for linked views
//     Object.entries(windows).forEach(([viewportIndex, window]) => {
//       if (viewportIndex !== index) {
//         // We are basically doing the same as getSlice but with the world coordinate
//         // that we want to jump to instead of the camera focal point.
//         // I would rather do the camera adjustment directly but I keep
//         // doing it wrong and so this is good enough for now.
//         const renderWindow = window.genericRenderWindow.getRenderWindow();

//         const istyle = renderWindow.getInteractor().getInteractorStyle();
//         const sliceNormal = istyle.getSliceNormal();
//         const transform = vtkMatrixBuilder
//           .buildFromDegree()
//           .identity()
//           .rotateFromDirections(sliceNormal, [1, 0, 0]);

//         const mutatedWorldPos = worldPos.slice();
//         transform.apply(mutatedWorldPos);
//         const slice = mutatedWorldPos[0];

//         istyle.setSlice(slice);

//         renderWindow.render();
//       }

//       const renderer = window.genericRenderWindow.getRenderer();
//       const wPos = vtkCoordinate.newInstance();
//       wPos.setCoordinateSystemToWorld();
//       wPos.setValue(worldPos);

//       const displayPosition = wPos.getComputedDisplayValue(renderer);
//       const { svgWidgetManager } = window;
//       window.svgWidgets.crosshairsWidget.setPoint(
//         displayPosition[0],
//         displayPosition[1]
//       );
//       svgWidgetManager.render();
//     });
//   };
// }

/**
 * Planes are of type `{position:[x,y,z], normal:[x,y,z]}`
 * returns an [x,y,z] array, or NaN if they do not intersect.
 */
const getPlaneIntersection = (plane1, plane2, plane3) => {
  try {
    let line = vtkPlane.intersectWithPlane(
      plane1.position,
      plane1.normal,
      plane2.position,
      plane2.normal
    );
    if (line.intersection) {
      const { l0, l1 } = line;
      const intersectionLocation = vtkPlane.intersectWithLine(
        l0,
        l1,
        plane3.position,
        plane3.normal
      );
      if (intersectionLocation.intersection) {
        return intersectionLocation.x;
      }
    }
  } catch (err) {
    console.log("some issue calculating the plane intersection", err);
  }
  return NaN;
};

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
button {
  font-size: 14px;
  line-height: 20px;
}
button > img {
  vertical-align: middle;
  height: 20px;
}
button + button {
  margin-left: 8px;
}

button.active {
  background: #77b0df;
  border-color: #1370bd;
}

label + input {
  margin-left: 12px;
}

.row {
  display: flex;
  flex-direction: row;
  /* max-height: 600px; */
  padding: 2px;
  background: #000;
}
.col {
  flex: 1;
  max-height: 400px;
}
.col + .col {
  margin-left: 2px;
}
</style>

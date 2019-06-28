<template>
  <div>
    <p>This example demonstrates how to use the Crosshairs manipulator.</p>
    <select v-model="selectedFile">
      <option v-for="file in files" :key="file">{{ file }}</option>
    </select>
    <hr />

    <div v-if="loading">
      <h3>Loading...</h3>
    </div>
    <div v-else>
      <button @click="reset">Reset</button>
      <div class="row">
        <div class="col">
          <view-2d :volumes="volumes" :onCreated="storeApi(0)" />
        </div>
        <div class="col">
          <view-2d :volumes="volumes" :onCreated="storeApi(1)" />
        </div>
        <div class="col">
          <view-2d :volumes="volumes" :onCreated="storeApi(2)" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import vtkHttpDataSetReader from "vtk.js/Sources/IO/Core/HttpDataSetReader";
import vtkVolume from "vtk.js/Sources/Rendering/Core/Volume";
import vtkVolumeMapper from "vtk.js/Sources/Rendering/Core/VolumeMapper";
import vtkMatrixBuilder from "vtk.js/Sources/Common/Core/MatrixBuilder";
import vtkCoordinate from "vtk.js/Sources/Rendering/Core/Coordinate";
import vtkMath from "vtk.js/Sources/Common/Core/Math";

import {
  View2D,
  vtkInteractorStyleMPRCrosshairs,
  vtkSVGWidgetManager,
  vtkSVGCrosshairsWidget
} from "@/library";

import { files } from "@/components/examples";

export default {
  components: {
    "view-2d": View2D
  },
  data() {
    return {
      volumes: [],
      selectedFile: files[0],
      loading: true
    };
  },
  watch: {
    selectedFile(newVal) {
      this.loadData(newVal);
    }
  },
  created() {
    // unreactive local variables
    this.windows = [];
    this.files = files;
  },

  methods: {
    reset() {},
    storeApi(viewportIndex) {
      return window => {
        this.windows[viewportIndex] = window;

        const renderWindow = window.genericRenderWindow.getRenderWindow();
        const renderer = window.genericRenderWindow.getRenderer();
        const camera = renderer.getActiveCamera();

        // TODO: This is a hacky workaround because disabling the vtkInteractorStyleMPRSlice is currently
        // broken. The camera.onModified is never removed.
        renderWindow
          .getInteractor()
          .getInteractorStyle()
          .setVolumeMapper(null);

        const istyle = vtkInteractorStyleMPRCrosshairs.newInstance();

        renderWindow.getInteractor().setInteractorStyle(istyle);
        istyle.setVolumeMapper(window.volumes[0]);

        // TODO: adjust camera by position

        istyle.setCallback(
          getCrosshairCallbackForIndex(this.windows, viewportIndex)
        );

        const svgWidgetManager = vtkSVGWidgetManager.newInstance();
        svgWidgetManager.setRenderer(renderer);
        svgWidgetManager.setScale(1);

        const crosshairsWidget = vtkSVGCrosshairsWidget.newInstance();

        svgWidgetManager.addWidget(crosshairsWidget);
        svgWidgetManager.render();

        window.svgWidgetManager = svgWidgetManager;
        window.svgWidgets = {
          crosshairsWidget
        };

        switch (viewportIndex) {
          default:
          case 0:
            //Axial
            console.log("storeAPI sliceNormal");
            istyle.setSliceNormal([0, 0, 1], [0, 1, 0]);
            // camera.setViewUp(0, 1, 0);
            // camera.applyTransform(transform);
            break;
          case 1:
            // sagittal
            istyle.setSliceNormal([1, 0, 0], [0, 0, -1]);
            // camera.setViewUp(0, 0, -1);
            break;
          case 2:
            // Coronal
            istyle.setSliceNormal([0, 1, 0], [0, 0, -1]);
            // camera.setViewUp(0, 0, -1);
            break;
        }
        let data = {
          roll: camera.roll,
          yaw: camera.yaw,
          pitch: camera.pitch,
          viewMatrix: camera.getViewMatrix(),
          orientation: camera.getOrientation(),
          camera
        };
        console.log("storeAPI renderWindow rendering!", data);
        renderWindow.render();
      };
    },
    loadData(fileString) {
      this.loading = true;
      const reader = vtkHttpDataSetReader.newInstance({
        fetchGzip: true
      });
      const volumeActor = vtkVolume.newInstance();
      const volumeMapper = vtkVolumeMapper.newInstance();

      volumeActor.setMapper(volumeMapper);

      reader
        .setUrl(`/${fileString || this.selectedFile}`, { loadData: true })
        .then(() => {
          const data = reader.getOutputData();
          console.log("data direction", data.getDirection());
          // data.setDirection([1, 0, 0, 0, 1, 0, 0, 0, 1]);
          volumeMapper.setInputData(data);
          // console.log("got data", data, volumeMapper, volumeActor);
          // this.volumes[0].getMapper().getInputData().getDirection()
          this.volumes = [volumeActor];
          this.loading = false;
        });
    }
  },
  mounted() {
    this.loadData();
  }
};

function getStackScrollCallbackForIndex(windows, index) {
  return ({ worldPos }) => {
    windows.forEach((window, viewportIndex) => {
      if (viewportIndex !== index) {
        const renderWindow = window.genericRenderWindow.getRenderWindow();
        const istyle = renderWindow.getInteractor.getInteractorStyle();
        const sliceNormal = istyle.getSliceNormal();
      }
    });
  };
}

function getCrosshairCallbackForIndex(windows, index) {
  return ({ worldPos }) => {
    // Set camera focal point to world coordinate for linked views
    windows.forEach((window, viewportIndex) => {
      if (viewportIndex !== index) {
        // We are basically doing the same as getSlice but with the world coordinate
        // that we want to jump to instead of the camera focal point.
        // I would rather do the camera adjustment directly but I keep
        // doing it wrong and so this is good enough for now.
        const renderWindow = window.genericRenderWindow.getRenderWindow();

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

      const renderer = window.genericRenderWindow.getRenderer();
      const wPos = vtkCoordinate.newInstance();
      wPos.setCoordinateSystemToWorld();
      wPos.setValue(worldPos);

      const displayPosition = wPos.getComputedDisplayValue(renderer);
      const { svgWidgetManager } = window;
      window.svgWidgets.crosshairsWidget.setPoint(
        displayPosition[0],
        displayPosition[1]
      );
      svgWidgetManager.render();
    });
  };
}
</script>

<style lang="scss">
.row {
  display: flex;
  flex-direction: row;
  margin: 0 -0.5rem;
  justify-content: stretch;
  .col {
    // flex-grow: 1;
    width: 100%;
    padding: 0 0.5rem;
  }
}
</style>

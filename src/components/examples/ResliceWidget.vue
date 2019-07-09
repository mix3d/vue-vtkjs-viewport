<template>
  <div>
    <p>This example demonstrates how to implement the basic reslice widget.</p>
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
          <view-2d :volumes="volumes" :onCreated="saveView(0)" />
        </div>
        <div class="col">
          <view-2d :volumes="volumes" :onCreated="saveView(1)" />
        </div>
        <div class="col">
          <view-2d :volumes="volumes" :onCreated="saveView(2)" />
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

// import vtkOpenGLRenderWindow from 'vtk.js/Sources/Rendering/OpenGL/RenderWindow';
import vtkResliceCursor from "vtk.js/Sources/Interaction/Widgets/ResliceCursor/ResliceCursor";
import vtkResliceCursorLineRepresentation from "vtk.js/Sources/Interaction/Widgets/ResliceCursor/ResliceCursorLineRepresentation";
import vtkResliceCursorWidget from "vtk.js/Sources/Interaction/Widgets/ResliceCursor/ResliceCursorWidget";
// import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';
// import vtkRenderWindow from 'vtk.js/Sources/Rendering/Core/RenderWindow';
// import vtkRenderWindowInteractor from 'vtk.js/Sources/Rendering/Core/RenderWindowInteractor';

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
    this.widgets = [];
    this.widgetReps = [];
    this.resliceCursor = vtkResliceCursor.newInstance();
  },

  methods: {
    reset() {},
    saveView(viewportIndex) {
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

        // istyle.setCallback(
        //   getCrosshairCallbackForIndex(this.windows, viewportIndex)
        // );

        // const svgWidgetManager = vtkSVGWidgetManager.newInstance();
        // svgWidgetManager.setRenderer(renderer);
        // svgWidgetManager.setScale(1);

        // const crosshairsWidget = vtkSVGCrosshairsWidget.newInstance();

        // svgWidgetManager.addWidget(crosshairsWidget);
        // svgWidgetManager.render();

        // window.svgWidgetManager = svgWidgetManager;
        // window.svgWidgets = {
        //   crosshairsWidget
        // };

        this.widgets[viewportIndex] = vtkResliceCursorWidget.newInstance();
        this.widgetReps[
          viewportIndex
        ] = vtkResliceCursorLineRepresentation.newInstance();
        this.widgets[viewportIndex].setWidgetRep(
          this.widgetReps[viewportIndex]
        );
        this.widgetReps[viewportIndex]
          .getReslice()
          .setInputData(window.volumes[0].getMapper().getInputData());

        this.widgetReps[viewportIndex]
          .getCursorAlgorithm()
          .setResliceCursor(this.resliceCursor);

        this.widgets[viewportIndex].setInteractor(
          window.genericRenderWindow
            .getRenderer()
            .getRenderWindow()
            .getInteractor()
        );

        switch (viewportIndex) {
          default:
          case 0:
            //Axial
            this.widgetReps[viewportIndex]
              .getCursorAlgorithm()
              .setReslicePlaneNormalToXAxis();
            break;
          case 1:
            // sagittal
            this.widgetReps[viewportIndex]
              .getCursorAlgorithm()
              .setReslicePlaneNormalToYAxis();
            break;
          case 2:
            // Coronal
            this.widgetReps[viewportIndex]
              .getCursorAlgorithm()
              .setReslicePlaneNormalToZAxis();
            break;
        }
        this.widgets[viewportIndex].onInteractionEvent(() => {
          this.widgets[0].render();
          this.widgets[1].render();
          this.widgets[2].render();
        });
        this.widgets[viewportIndex].setEnabled(true);
        // let data = {
        //   roll: camera.roll,
        //   yaw: camera.yaw,
        //   pitch: camera.pitch,
        //   viewMatrix: camera.getViewMatrix(),
        //   orientation: camera.getOrientation(),
        //   camera
        // };
        // console.log("saveView renderWindow rendering!", data);
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
          this.resliceCursor.setImage(data);
          this.loading = false;
        });
    }
  },
  mounted() {
    this.loadData();
  }
};

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

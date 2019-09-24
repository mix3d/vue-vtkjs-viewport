<template>
  <div>
    <h2>DICOM Loader to Volume</h2>
    <p>
      This example shows how to load Dicom Files and convert into a VTK
      compatible volume.
    </p>
    <hr />
    <div>
      <input type="file" multiple ref="files" @change="handleFileUpload" />
    </div>
    <hr />
    <div v-if="loading">
      <h3>Loading...</h3>
    </div>
    <div v-else>
      <div class="row">
        <div class="col">
          <view-2d
            :volumes="volumes"
            :onCreated="this.saveComponentReference(0)"
            :painting="focusedWidgetId === 'PaintWidget'"
            :paint-filter-background-image-data="paintFilterBackgroundImageData"
          />
        </div>
        <div class="col">
          <view-2d
            :volumes="volumes"
            :onCreated="this.saveComponentReference(1)"
            :painting="focusedWidgetId === 'PaintWidget'"
            :paint-filter-background-image-data="paintFilterBackgroundImageData"
          />
        </div>
        <div class="col">
          <view-2d
            :volumes="volumes"
            :onCreated="this.saveComponentReference(2)"
            :painting="focusedWidgetId === 'PaintWidget'"
            :paint-filter-background-image-data="paintFilterBackgroundImageData"
          />
        </div>
        <div class="col">
          <view-3d
            :volumes="volumeRenderingVolumes"
            :onCreated="this.saveComponentReference(3)"
            :painting="focusedWidgetId === 'PaintWidget'"
            :paint-filter-background-image-data="paintFilterBackgroundImageData"
            :paintFilterLabelMapImageData="paintFilterLabelMapImageData"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { View2D, View3D, vtkInteractorStyleMPRWindowLevel } from "@/library";

import vtkVolume from "vtk.js/Sources/Rendering/Core/Volume";
import vtkVolumeMapper from "vtk.js/Sources/Rendering/Core/VolumeMapper";

import vtkColorTransferFunction from "vtk.js/Sources/Rendering/Core/ColorTransferFunction";
import vtkPiecewiseFunction from "vtk.js/Sources/Common/DataModel/PiecewiseFunction";

import dicomLoader from "@/library/lib/data/dicomLoader.js";

export default {
  components: {
    "view-2d": View2D,
    "view-3d": View3D
  },
  data() {
    return {
      volumes: [],
      components: [],
      volumeRenderingVolumes: [],
      focusedWidgetId: null,
      paintFilterBackgroundImageData: null,
      paintFilterLabelMapImageData: null,
      threshold: 1500,
      loading: true
    };
  },
  created() {
    // non-reactive data
  },
  watch: {},
  methods: {
    handleFileUpload() {
      console.log(this.$refs.files.files);
      this.loadData(this.$refs.files.files);
    },
    saveComponentReference(viewportIndex) {
      return component => {
        this.components[viewportIndex] = component;

        const istyle = vtkInteractorStyleMPRWindowLevel.newInstance();
        const renderWindow = component.genericRenderWindow.getRenderWindow();

        switch (viewportIndex) {
          case 0:
            //Axial
            renderWindow.getInteractor().setInteractorStyle(istyle);
            istyle.setSliceNormal([0, 0, 1], [0, 1, 0]);
            istyle.setVolumeMapper(component.volumes[0]);
            break;
          case 1:
            // sagittal
            renderWindow.getInteractor().setInteractorStyle(istyle);
            istyle.setSliceNormal([1, 0, 0], [0, 0, -1]);
            istyle.setVolumeMapper(component.volumes[0]);
            break;
          case 2:
            // Coronal
            renderWindow.getInteractor().setInteractorStyle(istyle);
            istyle.setSliceNormal([0, 1, 0], [0, 0, -1]);
            istyle.setVolumeMapper(component.volumes[0]);
            break;
          default:
            break;
        }
      };
    },

    rerenderAllViewports() {
      // Update all render windows, since the automatic re-render might not
      // happen if the viewport is not currently using the painting widget
      Object.keys(this.components).forEach(viewportIndex => {
        const renderWindow = this.components[
          viewportIndex
        ].genericRenderWindow.getRenderWindow();

        renderWindow.render();
      });
    },

    loadData(files) {
      this.loading = true;

      const loader = dicomLoader.newInstance();
      console.log(loader);

      const volumeActor = vtkVolume.newInstance();
      const volumeMapper = vtkVolumeMapper.newInstance();

      volumeActor.setMapper(volumeMapper);

      loader.readFileSeries(files || filesList).then(data => {
        volumeMapper.setInputData(data);
        const rgbTransferFunction = volumeActor
          .getProperty()
          .getRGBTransferFunction(0);
        rgbTransferFunction.setMappingRange(500, 3000);

        const volumeRenderingActor = createVolumeRenderingActor(data);

        this.volumes = [volumeActor];
        this.volumeRenderingVolumes = [volumeRenderingActor];
        this.paintFilterBackgroundImageData = data;
        this.loading = false;
      });
    }
  },
  mounted() {
    this.loadData();
  }
};

function createVolumeRenderingActor(imageData) {
  const mapper = vtkVolumeMapper.newInstance();
  mapper.setInputData(imageData);
  mapper.setSampleDistance(1);

  const actor = vtkVolume.newInstance();
  actor.setMapper(mapper);

  const rgbTransferFunction = actor.getProperty().getRGBTransferFunction(0);
  const range = imageData
    .getPointData()
    .getScalars()
    .getRange();
  rgbTransferFunction.setMappingRange(range[0], range[1]);

  // create color and opacity transfer functions
  const cfun = vtkColorTransferFunction.newInstance();
  cfun.addRGBPoint(range[0], 0.4, 0.2, 0.0);
  cfun.addRGBPoint(range[1], 1.0, 1.0, 1.0);

  const ofun = vtkPiecewiseFunction.newInstance();
  ofun.addPoint(0.0, 0.0);
  ofun.addPoint(1000.0, 0.3);
  ofun.addPoint(6000.0, 0.9);

  actor.getProperty().setRGBTransferFunction(0, cfun);
  actor.getProperty().setScalarOpacity(0, ofun);
  actor.getProperty().setScalarOpacityUnitDistance(0, 4.5);
  actor.getProperty().setInterpolationTypeToLinear();
  actor.getProperty().setUseGradientOpacity(0, true);
  actor.getProperty().setGradientOpacityMinimumValue(0, 15);
  actor.getProperty().setGradientOpacityMinimumOpacity(0, 0.0);
  actor.getProperty().setGradientOpacityMaximumValue(0, 100);
  actor.getProperty().setGradientOpacityMaximumOpacity(0, 1.0);
  actor.getProperty().setAmbient(0.7);
  actor.getProperty().setDiffuse(0.7);
  actor.getProperty().setSpecular(0.3);
  actor.getProperty().setSpecularPower(8.0);

  return actor;
}
</script>

<style scoped>
.col {
  max-width: 400px;
}
</style>

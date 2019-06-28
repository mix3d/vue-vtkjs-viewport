<template>
  <div>
    <h2>Image Segmentation via Paint Widget</h2>
    <p>
      This example demonstrates how to use VTK's PaintWidget and PaintFilter to
      perform manual segmentation.
    </p>
    <p>
      The painting tools can be toggled on/off. When painting is off,
      multiplanar reformatting rotation through the volume is enabled.
    </p>
    <p>
      Both components are displaying the same labelmap passed in as a
      <code>vtkImageData</code> object. Painting in one component will update
      the labelmap in the other view, even though each maintains their own
      instances and configurations of the PaintWidget, PaintFilter, and
      VolumeMappers required for interaction and rendering.
    </p>
    <p>
      A "Clear label map" button is provided to demonstrate how to interact with
      the labelmap externally from the components, e.g. to load a
      previously-created segmentation map.
    </p>
    <p>
      <strong>Note:</strong> The PaintWidget (circle on hover) is not currently
      visible in the 2D View component.
    </p>
    <select v-model="selectedFile">
      <option v-for="file in files" :key="file">{{ file }}</option>
    </select>
    <hr />
    <div v-if="loading">
      <h3>Loading...</h3>
    </div>
    <div v-else>
      <div>
        <h5>Set a Window/Level Preset</h5>
        <label>
          <input
            type="radio"
            value="rotate"
            name="widget"
            @change="setWidget"
            :checked="focusedWidgetId === null"
          />
          Rotate
        </label>
        <label>
          <input
            type="radio"
            value="PaintWidget"
            name="widget"
            @change="setWidget"
            :checked="focusedWidgetId === 'PaintWidget'"
          />
          Paint
        </label>
        <button className="btn btn-danger" @click="clearLabelMap">
          Clear label map
        </button>
        <label>
          <input
            type="number"
            step="100"
            :value="threshold"
            name="paint-threshold"
            @change="setThreshold"
          />
          Paint Threshold Density
        </label>
        <hr />
      </div>
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
          <view-3d
            :volumes="volumeRenderingVolumes"
            :onCreated="this.saveComponentReference(1)"
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
import { View2D, View3D } from "@/library";

import vtkHttpDataSetReader from "vtk.js/Sources/IO/Core/HttpDataSetReader";
import vtkVolume from "vtk.js/Sources/Rendering/Core/Volume";
import vtkVolumeMapper from "vtk.js/Sources/Rendering/Core/VolumeMapper";

import vtkImageData from "vtk.js/Sources/Common/DataModel/ImageData";
import vtkDataArray from "vtk.js/Sources/Common/Core/DataArray";
import vtkColorTransferFunction from "vtk.js/Sources/Rendering/Core/ColorTransferFunction";
import vtkPiecewiseFunction from "vtk.js/Sources/Common/DataModel/PiecewiseFunction";

import { files } from "@/components/examples";

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
      loading: true,
      selectedFile: files[0]
    };
  },
  created() {
    // non-reactive data
    this.files = files;
  },
  watch: {
    selectedFile(newVal) {
      this.loadData(newVal);
    }
  },
  methods: {
    setWidget(event) {
      const widgetId = event.target.value;

      if (widgetId === "rotate") {
        this.focusedWidgetId = null;
      } else {
        this.focusedWidgetId = widgetId;
      }
    },

    setThreshold(event) {
      if (!event.target.value) {
        return;
      }

      const threshold = parseFloat(event.target.value);

      this.setThresholdFromValue(threshold);
    },

    setThresholdFromValue(threshold) {
      Object.keys(this.components).forEach(viewportIndex => {
        const paintFilter = this.components[viewportIndex].filters[0];

        paintFilter.setVoxelFunc((bgValue, idx) => {
          return bgValue[0] > threshold;
        });
      });

      this.threshold = threshold;
    },

    clearLabelMap() {
      const labelMapImageData = this.paintFilterLabelMapImageData;
      const numberOfPoints = labelMapImageData.getNumberOfPoints();
      const values = new Uint8Array(numberOfPoints);
      const dataArray = vtkDataArray.newInstance({
        numberOfComponents: 1, // labelmap with single component
        values
      });
      labelMapImageData.getPointData().setScalars(dataArray);

      labelMapImageData.modified();

      this.rerenderAllViewports();
    },

    saveComponentReference(viewportIndex) {
      return component => {
        this.components[viewportIndex] = component;

        this.setThresholdFromValue(this.threshold);
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
          // Force the volume direction
          // data.setDirection([1, 0, 0, 0, 1, 0, 0, 0, 1]);
          volumeMapper.setInputData(data);
          const rgbTransferFunction = volumeActor
            .getProperty()
            .getRGBTransferFunction(0);
          rgbTransferFunction.setMappingRange(500, 3000);

          const labelMapImageData = createLabelMapImageData(data);
          const volumeRenderingActor = createVolumeRenderingActor(data);

          this.volumes = [volumeActor];
          this.volumeRenderingVolumes = [volumeRenderingActor];
          this.paintFilterBackgroundImageData = data;
          this.paintFilterLabelMapImageData = labelMapImageData;
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
  mapper.setSampleDistance(20);

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

/**
 * Create a labelmap image with the same dimensions as our background volume.
 *
 * @param backgroundImageData vtkImageData
 */
function createLabelMapImageData(backgroundImageData) {
  const labelMapData = vtkImageData.newInstance(
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

  return labelMapData;
}
</script>

<style></style>

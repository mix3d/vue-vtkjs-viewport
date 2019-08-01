<template>
  <div>
    <h2>MPR Planes</h2>
    <p>
      Attempts at final integration of MPR with all the bells and whistles.
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
        <button @click="selectTool('LEVEL')" :class="{active:activeTool==='LEVEL'}">
          <img src="https://img.icons8.com/material-rounded/344/contrast.png" />
          Level
        </button>
        <button @click="selectTool('SELECT')" :class="{active:activeTool==='SELECT'}">
          <img src="https://img.icons8.com/material/344/define-location.png" />
          Select
        </button>
      </div>
      <div class="row">
        <div class="col" v-for="(view, key) in viewDataArray" :key="key">
          <table>
              <tr>
                <td><strong>{{key}}</strong></td>
              </tr>
              <tr>
                <td>Rotate SlicePlane X</td>
                <td><input
                    class="rotate"
                    type="range"
                    min="-89"
                    max="89"
                    step="1"
                    v-model.number="view.slicePlaneXRotation"
                  />
                  <span>{{view.slicePlaneXRotation}}&deg;</span>
                </td>
              </tr>
              <tr>
                <td>Rotate SlicePlane Y</td>
                <td><input
                    class="rotate"
                    type="range"
                    min="-89"
                    max="89"
                    step="1"
                    v-model.number="view.slicePlaneYRotation"
                  />
                  <span>{{view.slicePlaneYRotation}}&deg;</span>
                </td>
              </tr>
              <tr>
                <td>Rotate View</td>
                <td>
                  <input type="radio" :id="`${key}1rot`" :value="0" v-model="view.viewRotation">
                  <label :for="`${key}1rot`">0&deg;</label>

                  <input type="radio" :id="`${key}2rot`" :value="90" v-model="view.viewRotation">
                  <label :for="`${key}2rot`">90&deg;</label>

                  <input type="radio" :id="`${key}3rot`" :value="180" v-model="view.viewRotation">
                  <label :for="`${key}3rot`">180&deg;</label>

                  <input type="radio" :id="`${key}4rot`" :value="270" v-model="view.viewRotation">
                  <label :for="`${key}4rot`">270&deg;</label>
                </td>
              </tr>
              <tr>
                <td>Slice Thickness
                </td>
                <td><input
                    class="rotate"
                    type="range"
                    min="0.1"
                    max="50"
                    step=".1"
                    v-model.number="view.sliceThickness"
                  />
                  <span>{{view.sliceThickness}}</span>
                </td>
              </tr>
              <tr>
                <td>Blend Mode
                </td>
                <td>
                  <input type="radio" :id="`${key}1blend`" value="none" v-model="view.blendMode">
                  <label :for="`${key}1blend`">None</label>

                  <input type="radio" :id="`${key}2blend`" value="MIP" v-model="view.blendMode">
                  <label :for="`${key}2blend`">MIP</label>

                  <input type="radio" :id="`${key}3blend`" value="MINIP" v-model="view.blendMode">
                  <label :for="`${key}3blend`">MinIP</label>

                  <input type="radio" :id="`${key}4blend`" value="AVG" v-model="view.blendMode">
                  <label :for="`${key}4blend`">Average</label>

                </td>
              </tr>
            </table>
          <view-2d-mpr
            :volumes="volumes"
            v-bind="view"
            :onCreated="saveComponentReference(key)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { View2dMPR, View, vtkInteractorStyleMPRCrosshairs } from "@/library";

import vtkHttpDataSetReader from "vtk.js/Sources/IO/Core/HttpDataSetReader";
import vtkVolume from "vtk.js/Sources/Rendering/Core/Volume";
import vtkVolumeMapper from "vtk.js/Sources/Rendering/Core/VolumeMapper";

import vtkMatrixBuilder from "vtk.js/Sources/Common/Core/MatrixBuilder";

import vtkImageMapper from "vtk.js/Sources/Rendering/Core/ImageMapper";
import vtkImageSlice from "vtk.js/Sources/Rendering/Core/ImageSlice";

import { files } from "@/components/examples";

export default {
  components: {
    "view-2d-mpr": View2dMPR,
    "view-generic": View
  },
  data() {
    return {
      volumes: [],
      components: [],
      focusedWidgetId: null,
      activeTool: 'LEVEL',
      window: {
        min: 0,
        max: 0,
        value: 3926
      },
      level: {
        min: 0,
        max: 0,
        value: 1963
      },
      loading: true,
      selectedFile: files[0],
      top: {
        slicePlaneNormal: [0,0,1],
        sliceViewUp: [0,-1,0],
        slicePlaneXRotation: 0,
        slicePlaneYRotation: 0,
        viewRotation: 0,
        sliceThickness: 0.1,
        blendMode: "",
      },
      left: {
        slicePlaneNormal: [1,0,0],
        sliceViewUp: [0,0,-1],
        slicePlaneXRotation: 0,
        slicePlaneYRotation: 0,
        viewRotation: 0,
        sliceThickness: 0.1,
        blendMode: "",
      },
      front: {
        slicePlaneNormal: [0,1,0],
        sliceViewUp: [0,0,-1],
        slicePlaneXRotation: 0,
        slicePlaneYRotation: 0,
        viewRotation: 0,
        sliceThickness: 0.1,
        blendMode: "",
      },
    };
  },
  computed: {
    voi() {
      console.log("voi", Number(this.level.value), Number(this.window.value));
      return {
        windowCenter: Number(this.level.value),
        windowWidth: Number(this.window.value)
      };
    },
    viewDataArray(){
      return {top:this.top, left:this.left, front:this.front};
    },
    dataDetails() {
      return {
        voi: this.voi
      };
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
    window:{
      handler(newWindow){
        this.updateColorWindow(newWindow.value)
      },
      deep:true
    },
    level: {
      handler(newLevel){
        this.updateColorLevel(newLevel.value)
      },
      deep:true
    },
  },
  methods: {
    selectTool(tool){
      this.activeTool = tool;
      switch(tool)
      {
        case "LEVEL":
          break;
        case "SELECT":
          break;
      }
    },

    setWidget(event) {
      const widgetId = event.target.value;

      if (widgetId === "rotate") {
        this.focusedWidgetId = null;
      } else {
        this.focusedWidgetId = widgetId;
      }
    },

    updateColorLevel(level) {
      const colorLevel = Number(level || this.colorLevel);
      // Object.values(this.imageActors).forEach(actor =>
      //   actor.getProperty().setColorLevel(colorLevel)
      // );
      // this.rerenderAllViewports();
    },

    updateColorWindow(window) {
      const colorWindow = Number(window || this.window);
      // Object.values(this.imageActors).forEach(actor =>
      //   actor.getProperty().setColorWindow(colorWindow)
      // );
      // this.rerenderAllViewports();
    },

    saveComponentReference(viewportIndex) {
      return component => {
        this.components[viewportIndex] = component;

        const renderWindow = component.genericRenderWindow.getRenderWindow();
        const renderer = component.genericRenderWindow.getRenderer();

        renderWindow
              .getInteractor()
              .getInteractorStyle()
              .setVolumeMapper(null);
        const istyle = vtkInteractorStyleMPRCrosshairs.newInstance();
        renderWindow.getInteractor().setInteractorStyle(istyle);
        istyle.setVolumeMapper(component.volumes[0]);

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

          // update slice min/max values for interface
          // Crate imageMapper for I,J,K planes
          const dataRange = data
            .getPointData()
            .getScalars()
            .getRange();
          const extent = data.getExtent();
          this.window = {
            min: 0,
            max: dataRange[1] * 2,
            value: dataRange[1]
          };
          this.level = {
            min: -dataRange[1],
            max: dataRange[1],
            value: (dataRange[0] + dataRange[1]) / 2
          };
          this.updateColorLevel();
          this.updateColorWindow();

          this.volumes = [volumeActor];
          this.loading = false;
        });
    }
  },
  mounted() {
    this.loadData();
  }
};
</script>

<style scoped>
.col{
  max-height: 400px;
}

button{
  font-size:14px;
  line-height:20px;
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
</style>

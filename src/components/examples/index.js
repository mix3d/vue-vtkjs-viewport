import MPRCrosshairs from "./MPRCrosshairs.vue";
import BasicVolume from "./BasicVolume.vue";

export default [
  {
    title: "Basic Usage",
    url: "basic",
    description:
      "How to use the component to render an array of vtkVolumes and manipulate their RGB Transfer Functions",
    component: BasicVolume
  },
  {
    title: "MPR Crosshairs",
    url: "crosshairs",
    description:
      "Demonstrates how to set up the Crosshairs interactor style and SVG Widget",
    component: MPRCrosshairs
  }
];

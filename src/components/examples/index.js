import BasicVolume from "./BasicVolume.vue";
import MPRCrosshairs from "./MPRCrosshairs.vue";
import PaintWidget from "./PaintWidget.vue";
import SlicePlanes from "./SlicePlanes.vue";
import ResliceWidget from "./ResliceWidget.vue";
import MPRPlanes from "./MPRPlanes.vue";
import DicomLoader from "./DicomLoader.vue";

export const files = [
  "headsq.vti",
  "LIDC2.vti",
  "vmhead2-small.vti",
  "vmhead2-large.vti"
];

export default [
  {
    title: "Basic Usage",
    url: "basic",
    description:
      "How to use the component to render an array of vtkVolumes and manipulate their RGB Transfer Functions",
    component: BasicVolume
  },
  {
    title: "Image Segmentation via Paint Widget",
    url: "paintwidget",
    description:
      "This example demonstrates how to use VTK's PaintWidget and PaintFilter to perform manual segmentation.",
    component: PaintWidget
  },
  {
    title: "MPR Crosshairs",
    url: "crosshairs",
    description:
      "Demonstrates how to set up the Crosshairs interactor style and SVG Widget",
    component: MPRCrosshairs
  },
  {
    title: "MultiSlicePlanes",
    url: "sliceplanes",
    description:
      "Demonstrates how to set up the Crosshairs interactor style and SVG Widget",
    component: SlicePlanes
  },
  {
    title: "Reslice Widget",
    url: "reslice",
    description:
      "Implementing the ResliceWidget based on VTK examples but with a real volume",
    component: ResliceWidget
  },
  {
    title: "Dicom Loader",
    url: "dicom",
    description: "turn Dicom slices into a vtk volume",
    component: DicomLoader
  },
  {
    title: "Full MPR Example",
    url: "mpr",
    description: "Example of a fully functional MPR implementation",
    component: MPRPlanes
  }
];

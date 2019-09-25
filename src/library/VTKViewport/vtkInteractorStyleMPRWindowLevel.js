import macro from "vtk.js/Sources/macro";
import vtkMouseCameraTrackballRotateManipulator from "vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballRotateManipulator";
import vtkMouseCameraTrackballPanManipulator from "vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballPanManipulator";
import vtkMouseCameraTrackballZoomManipulator from "vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballZoomManipulator";
import vtkMouseRangeManipulator from "vtk.js/Sources/Interaction/Manipulators/MouseRangeManipulator";
import Constants from "vtk.js/Sources/Rendering/Core/InteractorStyle/Constants";

import vtkInteractorStyleMPRSlice from "./vtkInteractorStyleMPRSlice.js";

import {
  toWindowLevel,
  toLowHighRange
} from "../lib/windowLevelRangeConverter";

const { States } = Constants;

// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// vtkInteractorStyleMPRWindowLevel methods
// ----------------------------------------------------------------------------

function vtkInteractorStyleMPRWindowLevel(publicAPI, model) {
  // Set our className
  model.classHierarchy.push("vtkInteractorStyleMPRWindowLevel");

  model.trackballManipulator = vtkMouseCameraTrackballRotateManipulator.newInstance(
    {
      button: 1
    }
  );
  model.panManipulator = vtkMouseCameraTrackballPanManipulator.newInstance({
    button: 1,
    shift: true
  });

  // TODO: The inherited zoom manipulator does not appear to be working?
  model.zoomManipulator = vtkMouseCameraTrackballZoomManipulator.newInstance({
    button: 3
  });
  model.scrollManipulator = vtkMouseRangeManipulator.newInstance({
    scrollEnabled: true,
    dragEnabled: false
  });

  function updateScrollManipulator() {
    const range = publicAPI.getSliceRange();
    model.scrollManipulator.removeScrollListener();
    model.scrollManipulator.setScrollListener(
      range[0],
      range[1],
      1,
      publicAPI.getSlice,
      publicAPI.setSlice
    );
  }

  function setManipulators() {
    publicAPI.removeAllMouseManipulators();
    publicAPI.addMouseManipulator(model.trackballManipulator);
    publicAPI.addMouseManipulator(model.panManipulator);
    publicAPI.addMouseManipulator(model.zoomManipulator);
    publicAPI.addMouseManipulator(model.scrollManipulator);
    updateScrollManipulator();
  }

  const superHandleMouseMove = publicAPI.handleMouseMove;
  publicAPI.handleMouseMove = callData => {
    const pos = [callData.position.x, callData.position.y];

    if (model.state === States.IS_WINDOW_LEVEL) {
      publicAPI.windowLevelFromMouse(pos);
      publicAPI.invokeInteractionEvent({ type: "InteractionEvent" });
    }

    if (superHandleMouseMove) {
      superHandleMouseMove(callData);
    }
  };

  const superSetVolumeMapper = publicAPI.setVolumeMapper;
  publicAPI.setVolumeMapper = mapper => {
    if (superSetVolumeMapper(mapper)) {
      const renderer = model.interactor.getCurrentRenderer();
      const camera = renderer.getActiveCamera();
      if (mapper) {
        // prevent zoom manipulator from messing with our focal point
        camera.setFreezeFocalPoint(true);

        // NOTE: Disabling this because it makes it more difficult to switch
        // interactor styles. Need to find a better way to do this!
        // publicAPI.setSliceNormal(...publicAPI.getSliceNormal());
      } else {
        camera.setFreezeFocalPoint(false);
      }
    }
  };

  publicAPI.windowLevelFromMouse = ([mx, my]) => {
    const range = model.volumeMapper
      .getMapper()
      .getInputData()
      .getPointData()
      .getScalars()
      .getRange();
    const imageDynamicRange = range[1] - range[0];
    const multiplier = (imageDynamicRange / 1024) * model.levelScale;

    const dx = (mx - model.wlStartPos[0]) * multiplier;
    // scale the center at a smaller scale
    const dy = (my - model.wlStartPos[1]) * multiplier * 0.5;

    let { windowWidth, windowCenter } = publicAPI.getWindowLevel();

    windowWidth = Math.max(1, Math.round(windowWidth + dx));
    windowCenter = Math.round(windowCenter + dy);

    publicAPI.setWindowLevel(windowWidth, windowCenter);

    model.wlStartPos = [mx, my];

    const onLevelsChanged = publicAPI.getOnLevelsChanged();
    if (onLevelsChanged) {
      onLevelsChanged({ windowCenter, windowWidth });
    }
  };

  publicAPI.getWindowLevel = () => {
    const range = model.volumeMapper
      .getProperty()
      .getRGBTransferFunction(0)
      .getMappingRange()
      .slice();
    return toWindowLevel(...range);
  };
  publicAPI.setWindowLevel = (windowWidth, windowCenter) => {
    const lowHigh = toLowHighRange(windowWidth, windowCenter);

    model.volumeMapper
      .getProperty()
      .getRGBTransferFunction(0)
      .setMappingRange(lowHigh.lower, lowHigh.upper);
  };

  const superHandleLeftButtonPress = publicAPI.handleLeftButtonPress;
  publicAPI.handleLeftButtonPress = callData => {
    model.wlStartPos = [callData.position.x, callData.position.y];
    if (!callData.shiftKey && !callData.controlKey) {
      publicAPI.startWindowLevel();
    } else if (superHandleLeftButtonPress) {
      superHandleLeftButtonPress(callData);
    }
  };

  publicAPI.superHandleLeftButtonRelease = publicAPI.handleLeftButtonRelease;
  publicAPI.handleLeftButtonRelease = () => {
    switch (model.state) {
      case States.IS_WINDOW_LEVEL:
        publicAPI.endWindowLevel();
        break;

      default:
        publicAPI.superHandleLeftButtonRelease();
        break;
    }
  };

  setManipulators();
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  wlStartPos: [0, 0],
  levelScale: 1
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Inheritance
  vtkInteractorStyleMPRSlice.extend(publicAPI, model, initialValues);

  macro.setGet(publicAPI, model, [
    "volumeMapper",
    "onLevelsChanged",
    "levelScale"
  ]);

  // Object specific methods
  vtkInteractorStyleMPRWindowLevel(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(
  extend,
  "vtkInteractorStyleMPRWindowLevel"
);

// ----------------------------------------------------------------------------

export default Object.assign({ newInstance, extend });

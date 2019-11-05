import macro from "vtk.js/Sources/macro";
import Constants from "vtk.js/Sources/Rendering/Core/InteractorStyle/Constants";
import vtkCoordinate from "vtk.js/Sources/Rendering/Core/Coordinate";

// Extend our internal MPRSlice function
import vtkInteractorStyleMPRSlice from "./vtkInteractorStyleMPRSlice.js";
import { ACTIONS } from "./consts.js";

const { States } = Constants;

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  wlStartPos: [0, 0],
  levelScale: 1,
  buttonActions: {
    left: null,
    middle: null,
    right: null
  }
};

// ----------------------------------------------------------------------------
// vtkInteractorStyleMPR methods
// ----------------------------------------------------------------------------

function vtkInteractorStyleMPR(publicAPI, model) {
  // Set our className
  model.classHierarchy.push("vtkInteractorStyleMPR");

  model.Actions = {
    [ACTIONS.level]: {
      state: States.IS_WINDOW_LEVEL,
      start: callData => {
        console.log("INTERACTOR: START LEVEL", model.mtime);
        model.wlStartPos = [callData.position.x, callData.position.y];
        publicAPI.startWindowLevel();
      },
      onMove: callData => {
        console.log("INTERACTOR: MOVE LEVEL", model.mtime);
        publicAPI.windowLevelFromMouse(callData);
      },
      end: callData => {
        console.log("INTERACTOR: END LEVEL", model.mtime);
        publicAPI.endWindowLevel();
      }
    },
    [ACTIONS.crosshair]: {
      state: States.IS_SLICE,
      start: callData => {
        console.log("INTERACTOR: START CROSSHAIR", model.mtime);
        if (model.volumeActor) {
          publicAPI.selectPointIn3dSpace(callData);
          publicAPI.startSlice();
        }
      },
      onMove: callData => {
        console.log("INTERACTOR: MOVE CROSSHAIR", model.mtime);
        publicAPI.selectPointIn3dSpace(callData);
      },
      end: callData => {
        console.log("INTERACTOR: END CROSSHAIR", model.mtime);
        publicAPI.endSlice();
      }
    }
  };

  publicAPI.setLeftButtonAction = actionLabel => {
    model.buttonActions.left = model.Actions[actionLabel];
    publicAPI.modified()
    console.log("INTERACTOR: set left button", model.mtime, actionLabel);
  };
  publicAPI.setRightButtonAction = actionLabel => {
    model.buttonActions.right = model.Actions[actionLabel];
    publicAPI.modified()
    console.log("INTERACTOR: set right button", model.mtime, actionLabel);
  };
  publicAPI.setMiddleButtonAction = actionLabel => {
    model.buttonActions.middle = model.Actions[actionLabel];
    publicAPI.modified()
    console.log("INTERACTOR: set middle button", model.mtime, actionLabel);
  };

  publicAPI.windowLevelFromMouse = callData => {
    const { x, y } = callData.position;
    const range = model.volumeActor
      .getMapper()
      .getInputData()
      .getPointData()
      .getScalars()
      .getRange();
    const imageDynamicRange = range[1] - range[0];
    const multiplier = (imageDynamicRange / 1024) * model.levelScale;

    const dx = (x - model.wlStartPos[0]) * multiplier;
    // scale the center at a smaller scale
    // negative so up on the screen is lower center
    const dy = (y - model.wlStartPos[1]) * multiplier * 0.5 * -1;

    let { windowWidth, windowCenter } = publicAPI.getWindowLevel();

    windowWidth = Math.max(1, Math.round(windowWidth + dx));
    windowCenter = Math.round(windowCenter + dy);

    publicAPI.setWindowLevel(windowWidth, windowCenter);

    model.wlStartPos = [x, y];

    const onLevelsChanged = publicAPI.getOnLevelsChanged();
    if (onLevelsChanged) {
      onLevelsChanged({ windowCenter, windowWidth });
    }

    publicAPI.invokeInteractionEvent({ type: "InteractionEvent" });
  };

  publicAPI.selectPointIn3dSpace = callData => {
    const renderer = callData.pokedRenderer;
    const dPos = vtkCoordinate.newInstance();
    dPos.setCoordinateSystemToDisplay();
    dPos.setValue(callData.position.x, callData.position.y, 0);
    const worldPos = dPos.getComputedWorldValue(renderer);

    const onPointSelected = publicAPI.getOnPointSelected();
    if (worldPos.length && onPointSelected) {
      onPointSelected({
        worldPos,
        displayPos: [callData.position.x, callData.position.y]
      });
    }

    publicAPI.invokeInteractionEvent({ type: "InteractionEvent" });
  };

  publicAPI.getMtime = () => model.mtime;

  // Extend the parent / super handleMouseMove function
  publicAPI.handleMouseMove = macro.chain(
    publicAPI.handleMouseMove,
    callData => {
      let currentActions = Object.values(model.Actions).filter(
        action => action.state === model.state
      );
      if (currentActions.length) {
        currentActions.forEach(action => action.onMove(callData));
      }
    }
  );

  publicAPI.handleButtonPress = (callData, action, superHandleButtonPress) => {
    if (action && !callData.shiftKey && !callData.controlKey) {
      console.log("handling button press", model.mtime);
      action.start(callData);
    } else if (superHandleButtonPress) {
      superHandleButtonPress(callData);
    }
  };

  const superHandleLeftButtonPress = publicAPI.handleLeftButtonPress;
  publicAPI.handleLeftButtonPress = callData => {
    console.log("INTERACTOR: Left Button Press", model.mtime);
    publicAPI.handleButtonPress(
      callData,
      model.buttonActions.left,
      superHandleLeftButtonPress
    );
  };
  const superHandleRightButtonPress = publicAPI.handleRightButtonPress;
  publicAPI.handleRightButtonPress = callData =>
    publicAPI.handleButtonPress(
      callData,
      model.buttonActions.right,
      superHandleRightButtonPress
    );

  const superHandleMiddleButtonPress = publicAPI.handleMiddleButtonPress;
  publicAPI.handleMiddleButtonPress = callData =>
    publicAPI.handleButtonPress(
      callData,
      model.buttonActions.middle,
      superHandleMiddleButtonPress
    );

  publicAPI.handleButtonRelease = (callData, superHandleButtonRelease) => {
    let currentActions = Object.values(model.Actions).filter(
      action => action.state === model.state
    );
    if (currentActions.length) {
      currentActions.forEach(action => action.end(callData));
    } else if (superHandleButtonRelease) {
      superHandleButtonRelease();
    }
  };
  const superHandleLeftButtonRelease = publicAPI.handleLeftButtonRelease;
  publicAPI.handleLeftButtonRelease = callData => {
    console.log("INTERACTOR: Left Mouse Release", model.mtime);
    publicAPI.handleButtonRelease(callData, superHandleLeftButtonRelease);
  };
  const superHandleRightButtonRelease = publicAPI.handleRightButtonRelease;
  publicAPI.handleRightButtonRelease = callData =>
    publicAPI.handleButtonRelease(callData, superHandleRightButtonRelease);
  const superHandleMiddleButtonRelease = publicAPI.handleMiddleButtonRelease;
  publicAPI.handleMiddleButtonRelease = callData => {
    publicAPI.handleButtonRelease(callData, superHandleMiddleButtonRelease);
  };

  publicAPI.init();
}

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Inheritance
  vtkInteractorStyleMPRSlice.extend(publicAPI, model, initialValues);

  macro.setGet(publicAPI, model, [
    "onLevelsChanged",
    "levelScale",
    "onPointSelected"
  ]);

  // Instantiate Object specific methods
  vtkInteractorStyleMPR(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(
  extend,
  "vtkInteractorStyleMPRWindowLevel"
);

// ----------------------------------------------------------------------------

export default Object.assign({ newInstance, extend });

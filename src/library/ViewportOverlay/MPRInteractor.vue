<template>
  <svg
    v-if="point && point.length"
    :width="width"
    :height="height"
    :viewBox="viewBox"
    @mousemove="onMove"
    @mouseup="endMove"
    :class="svgClass"
  >
    <g :transform="viewTransform">
      <!-- Y line -->
      <g :transform="yTransform" :style="`color: ${yAxis.color}; fill: currentColor;`">
        <!-- Axis & rotation interactors -->
        <line
          :x1="x"
          :y1="y - maxLength"
          :x2="x"
          :y2="y + maxLength"
          style="stroke: currentColor; stroke-width:2"
        />
        <circle
          :cx="x"
          :cy="y + circlePos"
          r="6"
          @mousedown="(e) => startAction(e, 'rotateY')"
          :class="{'hover rotateCursor':true, 'active': mousedown && action === 'rotateY' && !invertAngle}"
        />
        <circle
          :cx="x"
          :cy="y - circlePos"
          r="6"
          @mousedown="(e) => startAction(e, 'rotateY', true)"
          :class="{'hover rotateCursor':true, 'active': mousedown && action === 'rotateY' && invertAngle}"
        />
        <!-- Thickness interactors -->
        <rect :x="x-4 + yThicknessPixels" :y="y + squarePos" width="8" height="8" class="hover thicknessCursor" @mousedown="(e) => startAction(e, 'thicknessY')" />
        <rect :x="x-4 + yThicknessPixels" :y="y - squarePos - 8" width="8" height="8" class="hover thicknessCursor" @mousedown="(e) => startAction(e, 'thicknessY')" />
        <g v-if="yAxis.thickness >= 1">
          <rect :x="x-4 - yThicknessPixels" :y="y + squarePos" width="8" height="8" class="hover thicknessCursor" @mousedown="(e) => startAction(e, 'thicknessY')" />
          <rect :x="x-4 - yThicknessPixels" :y="y - squarePos - 8" width="8" height="8" class="hover thicknessCursor" @mousedown="(e) => startAction(e, 'thicknessY')" />
          <g style="stroke: currentColor; stroke-width:1; stroke-dasharray: 4;">
            <line
              :x1="x - yThicknessPixels"
              :y1="y - maxLength"
              :x2="x - yThicknessPixels"
              :y2="y + maxLength"
            />
            <line
              :x1="x + yThicknessPixels"
              :y1="y - maxLength"
              :x2="x + yThicknessPixels"
              :y2="y + maxLength"
            />
          </g>
        </g>
      </g>

      <!-- X line -->
      <g :transform="xTransform" :style="`color: ${xAxis.color}; fill: currentColor;`">
        <!-- Axis & rotation interactors -->
        <line
          :x1="x - maxLength"
          :y1="y"
          :x2="x + maxLength"
          :y2="y"
          style="stroke: currentColor; stroke-width:2"
        />
        <circle
          :cx="x + circlePos"
          :cy="y"
          r="6"
          @mousedown="(e) => startAction(e, 'rotateX')"
          :class="{'hover rotateCursor':true, 'active': mousedown && action === 'rotateX' && !invertAngle}"
        />
        <circle
          :cx="x - circlePos"
          :cy="y"
          r="6"
          @mousedown="(e) => startAction(e, 'rotateX', true)"
          :class="{'hover rotateCursor':true, 'active': mousedown && action === 'rotateX' && invertAngle}"
        />
        <!-- Thickness interactors -->
        <rect :x="x + squarePos" :y="y-4 - xThicknessPixels" width="8" height="8" class="hover thicknessCursor" @mousedown="(e) => startAction(e, 'thicknessX')" />
        <rect :x="x - squarePos - 8" :y="y-4 - xThicknessPixels" width="8" height="8" class="hover thicknessCursor" @mousedown="(e) => startAction(e, 'thicknessX')" />
        <g v-if="xAxis.thickness >= 1">
          <rect :x="x + squarePos" :y="y-4 + xThicknessPixels" width="8" height="8" class="hover thicknessCursor" @mousedown="(e) => startAction(e, 'thicknessX')" />
          <rect :x="x - squarePos - 8" :y="y-4 + xThicknessPixels" width="8" height="8" class="hover thicknessCursor" @mousedown="(e) => startAction(e, 'thicknessX')"/>
          <g style="stroke: currentColor; stroke-width:1; stroke-dasharray: 4;">
            <line
              :x1="x - maxLength"
              :y1="y - xThicknessPixels"
              :x2="x + maxLength"
              :y2="y - xThicknessPixels"
            />
            <line
              :x1="x - maxLength"
              :y1="y + xThicknessPixels"
              :x2="x + maxLength"
              :y2="y + xThicknessPixels"
            />
          </g>
        </g>
      </g>
    </g>
  </svg>
</template>

<script>
import { radians2degrees } from "../lib/math/angles.js";
import { vec2, glMatrix } from "gl-matrix";

export default {
  name: "",

  props: {
    width: Number,
    height: Number,
    point: Array | Boolean,
    lockAxis: {
      type: Boolean,
      default: true
    },
    shiftToUnlockAxis: {
      type: Boolean,
      default: true
    },
    viewRotation: {
      type: Number,
      default: 0,
    },
    xAxis: {
      type: Object,
      default: () => ({
        color: "red",
        rotation: 0,
        thickness: 0,
      })
    },
    yAxis: {
      type: Object,
      default: () => ({
        color: "blue",
        rotation: 0,
        thickness: 0,
      })
    }
  },
  data() {
    return {
      mousedown: false,
      invertAngle: false,
      axisOffset: 0,
      action: ""
    };
  },
  methods: {
    onMove(event) {
      if (this.mousedown) {
        const shiftKey = event.shiftKey;
        const isX = this.action.endsWith("X");
        const newPos = [event.offsetX, event.offsetY];

        // account for the view's rotation by rotating the mouse position around the center
        if(this.viewRotation)
          vec2.rotate(newPos, newPos, [this.x, this.y], -glMatrix.toRadian(this.viewRotation))

        if(this.action.startsWith("rotate")) {
            // calculate the rotation angle from mouse to center [x, y]
            const nx = newPos[0] - this.x;
            const ny = newPos[1] - this.y;

            let angle = Math.floor(radians2degrees(Math.atan2(ny, nx)));

            if (this.invertAngle) {
              //if positive, subtract 180, if negative, add 180, to get the same value as the right handle
              angle += 180 * (angle < 0 ? 1 : -1);
            }
            if(!isX){
              //account for Y axis difference
              angle -= 90;
            }

            // NOTE: Use this only if we fix the 90deg bug and it works 0 - 180
            // if (angle >= 90) angle -= 180;
            // else if (angle <= -90) angle += 180;

            // Otherwise force to a 178 angle swing
            if (angle >= 89) angle = 89;
            else if (angle <= -89) angle = -89;

            // emit the rotation
            this.$emit("rotate", isX ? "x" : "y", angle);
            if (this.lockAxis && !(this.shiftToUnlockAxis && shiftKey)) {
              this.$emit("rotate", !isX ? "x" : "y", angle - this.axisOffset);
            }

        }
        else if(this.action.startsWith("thickness")){
          // adjust for the rotation of the plane to compare as if the axis wasn't rotated
          vec2.rotate(newPos, newPos, [this.x, this.y], -glMatrix.toRadian(isX ? this.xAxis.rotation : this.yAxis.rotation))
          let dist = Math.floor(isX ? Math.abs(newPos[1] - this.y) : Math.abs(newPos[0] - this.x))

          // Have a deadzone so it can snap to "nothing". Default is 0.1. Must be > 0 or it shows nothing
          if (dist < 3) dist = 0.05
          // Multiply by 2 since the thickness is split between the axis
          this.$emit('thickness', isX ? 'x' : 'y', dist * 2)
        }
      }
    },
    startAction(event, action, invertAngle = false) {
      this.action = action;
      this.mousedown = true;
      if(action.startsWith("rotate")){
        this.invertAngle = invertAngle;
        this.axisOffset = action.endsWith("X") ? this.xAxis.rotation - this.yAxis.rotation : this.yAxis.rotation - this.xAxis.rotation
      }
    },
    endMove(event) {
      this.mousedown = false;
    }
  },
  computed: {
    xTransform() {
      return `rotate(${this.xAxis.rotation}, ${this.x}, ${this.y})`;
    },
    yTransform() {
      return `rotate(${this.yAxis.rotation}, ${this.x}, ${this.y})`;
    },
    viewTransform() {
      return `rotate(${this.viewRotation}, ${this.x}, ${this.y})`;
    },
    yStyle() {
      return `color: ${this.yAxis.color}; stroke: currentColor; stroke-width:2`;
    },
    xThicknessPixels(){
      // TODO: also get the pixels to world coords ratio, so the thickness is actually reflecting the area being sliced
      let pxRatio = 1
      // divide by 2 so width is centered on the axisß
      return this.xAxis.thickness >= 1 ? this.xAxis.thickness * pxRatio / 2 : 0;
    },
    yThicknessPixels(){
      // TODO: also get the pixels to world coords ratio
      let pxRatio = 1
      // divide by 2 so width is centered on the axis
      return this.yAxis.thickness >= 1 ? this.yAxis.thickness * pxRatio / 2: 0;
    },

    maxLength() {
      // Guarentees axis lines are drawn to the edge
      return this.width > this.height ? this.width : this.height;
    },
    minLength() {
      //used to make sure everything is drawn inside the canvas
      return this.width < this.height ? this.width : this.height;
    },
    circlePos() {
      return Math.floor(this.minLength / 2.5);
    },
    squarePos() {
      return Math.floor(this.minLength / 6);
    },

    viewBox() {
      return `0 0 ${this.width} ${this.height}`;
    },

    x() {
      // Scale to window pixels if the screen is high density
      if (window.devicePixelRatio) {
        return this.point[0] / window.devicePixelRatio;
        //math.floor?
        // vtkMath.multiplyScalar(canvasCoords, 1/window.devicePixelRatio)
      }
      return this.point[0];
    },
    y() {
      if (window.devicePixelRatio) {
        return this.height - this.point[1] / window.devicePixelRatio;
      }
      // 0 is bottom left in vtk land vs canvas/svg
      return this.height - this.point[1];
    },
    svgClass(){
      return {
        'captureMouse': this.mousedown,
        'rotateCursor': this.mousedown && this.action.startsWith('rotate'),
        'thicknessCursor': this.mousedown && this.action.startsWith('thickness')
        }
    }
  }
};
</script>

<style scoped>
svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}
svg.captureMouse {
  pointer-events: all;
}
svg .hover {
  pointer-events: all;
  /* cursor: "pointer"; */
  /* Increase the mouse hover area */
  stroke: transparent;
  stroke-width: 6;
}
svg .hover:hover,
svg .hover.active {
  stroke: currentColor;
}

.thicknessCursor {
  cursor: col-resize;
}
.rotateCursor {
  cursor: url(data:image/svg+xml;charset=utf-8;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyNC4yNDUiPjxwYXRoIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxIiBkPSJNMTAgMjMuNzQ2Yy01LjIzOCAwLTkuNS00LjI2Mi05LjUtOS41YTkuOCA5LjggMCAwIDEgLjAxNC0uNTI3bC4wMjYtLjQ3M0g0LjU2NGwtLjA0NS41NDJBNS41MDcgNS41MDcgMCAwIDAgMTAgMTkuNzQ2YzMuMDMzIDAgNS41LTIuNDY3IDUuNS01LjUgMC0yLjg2NS0yLjItNS4yMjUtNS01LjQ3OHYzLjYwMWwtLjgzNS0uNzUxLTQuOTk5LTQuNS0uNDEzLS4zNzIuNDEzLS4zNzIgNS00LjUuODM0LS43NXYzLjYzNWM1LjAwNy4yNiA5IDQuNDE2IDkgOS40ODcgMCA1LjIzOC00LjI2MiA5LjUtOS41IDkuNXoiLz48L3N2Zz4=) 10 12, pointer;
}

.crosshairCursor {
  cursor: crosshair;
}
</style>
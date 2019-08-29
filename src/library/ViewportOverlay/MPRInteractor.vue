<template>
  <div>
    <svg
      v-if="point && point.length"
      :width="width"
      :height="height"
      :viewBox="viewBox"
      @mousemove="onMove"
      @mouseup="endMove"
      :class="{'captureMouse':mousedown}"
    >
      <!-- Y line -->
      <line
        :x1="x"
        :y1="y - length"
        :x2="x"
        :y2="y + length"
        :style="yStyle"
        :transform="yTransform"
      />

      <!-- X line -->
      <g :transform="xTransform">
        <line :x1="x - length" :y1="y" :x2="x + length " :y2="y" :style="xStyle" />

        <rect
          :x="x + width / 6"
          :y="y-3"
          width="6"
          height="6"
          :style="`color: ${xColor}`"
          fill="currentColor"
          class="hover"
        />
        <rect
          :x="x - width / 6"
          :y="y-3"
          width="6"
          height="6"
          :style="`color: ${xColor}`"
          fill="currentColor"
          class="hover"
        />

        <circle
          :cx="x + width / 2.5"
          :cy="y"
          r="4"
          :style="`color: ${xColor}`"
          @mousedown="() => startRotateX()"
          fill="currentColor"
          class="hover"
        />
        <!-- TODO: needs to onmousedown remember to add 180 to the result -->
        <circle
          :cx="x - width / 2.5"
          :cy="y"
          r="4"
          :style="`color: ${xColor}`"
          @mousedown="() => startRotateX(true)"
          fill="currentColor"
          class="hover"
        />
      </g>
      <!-- <circle :cx="centerX" :cy="centerY" r="10" stroke="red" fill="transparent" stroke-width="2"/> -->
      <!-- <circle :cx="x" :cy="y" r="10" stroke="yellow" fill="transparent" stroke-width="2"/> -->
    </svg>
    <p>TESTING: [{{x}}, {{y}}]</p>
  </div>
</template>

<script>
import { radians2degrees } from "../lib/math/angles.js";
export default {
  name: "",
  data() {
    return {
      mousedown: false,
      invertAngle: false,
      action: ""
    };
  },
  props: {
    width: Number,
    height: Number,
    point: Array,
    xColor: {
      type: String,
      default() {
        return "red";
      }
    },
    xRotation: { type: Number, default: 0 },
    yColor: {
      type: String,
      default() {
        return "blue";
      }
    },
    yRotation: { type: Number, default: 0 }
  },
  methods: {
    onMove(event) {
      if (this.mousedown) {
        switch (this.action) {
          case "rotateX": {
            //calculate the rotation angle from mouse to center x, y
            const nx = event.offsetX - this.x;
            const ny = event.offsetY - this.y;

            let angle = Math.floor(radians2degrees(Math.atan2(ny, nx)));

            if (this.invertAngle) {
              //if positive, subtract 180, if negative, add 180, to get the same value as the right handle
              angle += 180 * (angle < 0 ? 1 : -1)
            }
            // Use this only if we fix the 90deg bug and it works 0 - 180
            // if (angle >= 90) angle -= 180;
            // else if (angle <= -90) angle += 180;
            
            // Otherwise force to a 178 angle swing
            if (angle >= 89) angle = 89;
            else if (angle <= -89) angle = -89;

            // emit the rotation
            this.$emit("rotate", "x", angle);
            break;
          }
          case "rotateY": {

            break;
          }
        }
      }
    },
    startRotateX(invertAngle = false) {
      this.action = "rotateX";
      this.mousedown = true;
      this.invertAngle = invertAngle;
    },
    endMove(event) {
      this.mousedown = false;
    }
  },
  computed: {
    xTransform() {
      return `rotate(${this.xRotation}, ${this.x}, ${this.y})`;
    },
    xStyle() {
      return `color: ${this.xColor}; stroke: currentColor; stroke-width:2`;
    },
    yTransform() {
      return `rotate(${this.yRotation}, ${this.x}, ${this.y})`;
    },
    yStyle() {
      return `color: ${this.yColor}; stroke: currentColor; stroke-width:2`;
    },
    length() {
      // Guarentees line length is longer than diagonal (sqrt 2 factor ~ 1.41)
      return this.width > this.height ? this.width : this.height;
    },
    viewBox() {
      return `0 0 ${this.width} ${this.height}`;
    },
    x() {
      return this.point[0];
    },
    y() {
      return this.height - this.point[1];
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
  cursor: "pointer";
}
svg .hover:hover {
  stroke-width: 4;
  stroke: currentColor;
}
</style>
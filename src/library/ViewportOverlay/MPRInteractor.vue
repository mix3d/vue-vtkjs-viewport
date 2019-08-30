<template>
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
    <g :transform="yTransform" :style="`color: ${yAxis.color}; fill: currentColor;`">
      <line :x1="x" :y1="y - length" :x2="x" :y2="y + length" style="stroke: currentColor; stroke-width:2" />
      <rect
        :x="x-4"
        :y="y + width / 6"
        width="8"
        height="8"
        class="hoverSOON"
      />
      <rect
        :x="x-4"
        :y="y - width / 6"
        width="8"
        height="8"
        class="hoverSOON"
      />
      <circle
        :cx="x"
        :cy="y + width / 2.5"
        r="6"
        @mousedown="() => startRotateY()"
        :class="{'hover':true, 'active': mousedown && action === 'rotateY' && !invertAngle}"
      />
      <circle
        :cx="x"
        :cy="y - width / 2.5"
        r="6"
        @mousedown="() => startRotateY(true)"
        :class="{'hover':true, 'active': mousedown && action === 'rotateY' && invertAngle}"
      />
    </g>

    <!-- X line -->
    <g :transform="xTransform" :style="`color: ${xAxis.color}; fill: currentColor;`">
      <line :x1="x - length" :y1="y" :x2="x + length" :y2="y" style="stroke: currentColor; stroke-width:2" />
      <rect
        :x="x + width / 6"
        :y="y-4"
        width="8"
        height="8"
        class="hoverSOON"
      />
      <rect
        :x="x - width / 6"
        :y="y-4"
        width="8"
        height="8"
        class="hoverSOON"
      />

      <circle
        :cx="x + width / 2.5"
        :cy="y"
        r="6"
        @mousedown="() => startRotateX()"
        :class="{'hover':true, 'active': mousedown && action === 'rotateX' && !invertAngle}"
      />
      <circle
        :cx="x - width / 2.5"
        :cy="y"
        r="6"
        @mousedown="() => startRotateX(true)"
        :class="{'hover':true, 'active': mousedown && action === 'rotateX' && invertAngle}"
      />
    </g>
  </svg>
</template>

<script>
import { radians2degrees } from "../lib/math/angles.js";
export default {
  name: "",

  props: {
    width: Number,
    height: Number,
    point: Array,
    xAxis: {
      type: Object,
      default: () => ({
        color: 'red',
        rotation: 0,
      })
    },
    yAxis: {
      type: Object,
      default: () => ({
        color: 'blue',
        rotation: 0,
      })
    },
  },
  data() {
    return {
      mousedown: false,
      invertAngle: false,
      action: ""
    };
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
            //calculate the rotation angle from mouse to center x, y
            const nx = event.offsetX - this.x;
            const ny = event.offsetY - this.y;

            let angle = Math.floor(radians2degrees(Math.atan2(ny, nx)));

            angle -= 90

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
            this.$emit("rotate", "y", angle);
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
    startRotateY(invertAngle = false) {
      this.action = "rotateY";
      this.mousedown = true;
      this.invertAngle = invertAngle;
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
    yStyle() {
      return `color: ${this.yAxis.color}; stroke: currentColor; stroke-width:2`;
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
      // 0 is bottom left in vtk land vs canvas/svg
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
  stroke: transparent;
  stroke-width: 6;
}
svg .hover:hover, svg .hover.active {
  /* stroke-width: 4; */
  stroke: currentColor;
}
</style>
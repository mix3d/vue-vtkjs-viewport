<template>
  <div class="ViewportOverlay">
    <div v-if="color" class="viewColor" :style="colorStyle"></div>
    <div class="top-left overlay-element">
      <div>{{ formatPN(patientName) }}</div>
      <div>{{ patientId }}</div>
    </div>
    <div class="top-right overlay-element">
      <div>{{ studyDescription }}</div>
      <div>{{ formatDA(studyDate) }} {{ formatTM(studyTime) }}</div>
    </div>
    <div class="bottom-right overlay-element">
      <div>{{ wwwc }}</div>
    </div>
    <div class="bottom-left overlay-element">
      <div>{{ seriesNumber >= 0 ? `Ser: ${seriesNumber}` : "" }}</div>
      <div>
        <div>{{ seriesDescription }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { helpers } from "../helpers/index.js";

const {
  formatPN,
  formatDA,
  formatNumberPrecision,
  formatTM,
  isValidNumber
} = helpers;

export default {
  props: {
    voi: {
      type: Object,
      default: () => ({
        windowWidth: 0,
        windowCenter: 0
      })
    },
    studyDate: String,
    studyTime: String,
    studyDescription: String,
    patientName: String,
    patientId: String,
    seriesNumber: String,
    seriesDescription: String,
    color: String,
  },
  methods: {
    formatPN,
    formatDA,
    formatNumberPrecision,
    formatTM,
    isValidNumber
  },
  computed: {
    colorStyle(){
      return this.color && `background: ${this.color}` || '';
    },
    wwwc() {
      return `W: ${this.voi.windowWidth.toFixed(
        0
      )} L: ${this.voi.windowCenter.toFixed(0)}`;
    }
  }
};
</script>

<style lang="scss">
:root {
  --viewport-tag-padding: 20px;
}

.ViewportOverlay {
  color: #9ccef9;

  .viewColor{
    position: absolute;
    top:0;
    right:0;
    width: 16px;
    height: 16px;
  }

  .overlay-element {
    position: absolute;
    font-weight: 400;
    text-shadow: 1px 1px black;
    pointer-events: none;
  }

  .top-left {
    top: var(--viewport-tag-padding);
    left: var(--viewport-tag-padding);
  }

  .top-center {
    top: var(--viewport-tag-padding);
    padding-top: var(--viewport-tag-padding);
    width: 100%;
    text-align: center;
  }

  .top-right {
    top: var(--viewport-tag-padding);
    right: var(--viewport-tag-padding);
    text-align: right;
  }

  .bottom-left {
    bottom: var(--viewport-tag-padding);
    left: var(--viewport-tag-padding);
  }

  .bottom-right {
    bottom: var(--viewport-tag-padding);
    right: var(--viewport-tag-padding);
    text-align: right;
  }

  svg {
    color: #9ccef9;
    fill: #9ccef9;
    stroke: #9ccef9;
    background-color: transparent;
    margin: 2px;
    width: 18px;
    height: 18px;
  }
}
</style>

<template>
  <svg :width="width" :height="height">
    <circle :cx="centerX" :cy="centerY" r="10" stroke="red" fill="transparent" stroke-width="2"/>
  </svg>
</template>

<script>
export default {
  name:"",
  data(){
    return {

    }
  },
  props:{
    width: Number,
    height: Number,
    centerX: Number,
    centerY: Number,
  },
  methods:{

  }
}
</script>

<style scoped>
  svg {
    position: absolute;
    top:0;
    left:0;
  }
</style>
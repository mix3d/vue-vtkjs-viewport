<template>
  <div class="about">
    <p><router-link to="/">Back to Examples</router-link></p>
    <component :is="componentProp"></component>
  </div>
</template>

<script>
import examples from "./examples";

export default {
  props: ["path"],
  computed: {
    componentProp() {
      let example = examples.find(e => e.url === this.path);
      return example.component || null;
    }
  }
};
</script>

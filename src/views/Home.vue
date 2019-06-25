<template>
  <div class="home">
    <h2>VTK.js Vue Viewport Component</h2>
    <h5>What is this?</h5>
    <p>This is a set of re-usable components for displaying data with VTK.js</p>
    <h5>Why does it exist?</h5>
    <p>
      To provide a simple starting point for developers that wish to build Vue
      applications on top of VTK.js
    </p>
    <h3>Examples:</h3>
    <ul>
      <li v-for="example in examples" :key="example.title">
        <p>
          <router-link :to="'example/' + example.url">{{
            example.title
          }}</router-link>
        </p>
        <p>{{ example.description }}</p>
      </li>
    </ul>
  </div>
</template>

<script>
// @ is an alias to /src
// import HelloWorld from "@/components/HelloWorld.vue";
import examples from "@/components/examples";

export default {
  name: "home",
  computed: {
    examples() {
      return examples;
    }
  }
};
</script>

<style lang="scss" scoped>
ul {
  padding: 0;
  margin: 0;
  margin-left: 16px;
  list-style-type: none;
}
li {
  &:not(:last-child) {
    border-bottom: 1px solid #bbb;
  }
}
</style>

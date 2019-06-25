<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style lang="scss">
body{
  padding:0;margin:0;
}
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin-right: auto;
  margin-left: auto;
  padding: 1rem;
}
@media (min-width: 768px)
{#app {
    width: 750px;
}}
@media (min-width: 992px)
{#app {
    width: 970px;
}}
@media (min-width: 1200px)
{#app {
    width: 1170px;
}}
</style>

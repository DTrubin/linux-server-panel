<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const key = computed(() => route.path)

</script>

<template>
  <section class="app-main">
    <router-view v-slot="{ Component }">
      <component :is="Component" :key="key" />
    </router-view>
  </section>
</template>

<style lang="scss" scoped>
.app-main {
  flex: 1;
  position: relative;
  overflow: auto;
  padding: 20px;
  background-color: var(--el-bg-color-page);
}
</style>

<template>
  <div class="minabridge-page">
    <div class="menu">
      <span class="title">MinaBridge 茶饮菜单</span>
      <div class="card"><span>茉莉绿茶</span><span class="price">¥12</span></div>
      <div class="card"><span>桂花乌龙</span><span class="price">¥16</span></div>
    </div>
  </div>
</template>
<script>
import { setData, event, style, hover } from '../runtime.js';
import { wx, getCurrentPages, registerPage, unregisterPage } from '../navigation.js';

export default {
  props: ['minaQuery','minaId'],
  data() { return {}; },
  created() {
    registerPage(this.minaId,this);
    if(this.onLoad) this.onLoad(this.minaQuery || {});
  },
  mounted() {
    if(this.onShow) this.onShow();
  },
  beforeDestroy() {
    if(this.onUnload) this.onUnload();
    unregisterPage(this.minaId);
  },
  methods: {
    $minaSetData: setData,
    $minaEvent: event,
    $minaStyle: style,
    $minaHover: hover
  }
};
</script>
<style scoped>
.menu, [data-mina-placeholder~="menu"]::placeholder { padding: 40rpx; }
.title, [data-mina-placeholder~="title"]::placeholder { display: block; font-size: 40rpx; color: #5c3a21; margin-bottom: 30rpx; }
.card, [data-mina-placeholder~="card"]::placeholder { display: flex; justify-content: space-between; padding: 30rpx; margin-bottom: 20rpx; border-radius: 16rpx; background: white; }
.price, [data-mina-placeholder~="price"]::placeholder { color: #5c3a21; font-weight: bold; }
</style>
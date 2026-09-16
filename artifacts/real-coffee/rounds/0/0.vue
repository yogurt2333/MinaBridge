<template>
  <div class="minabridge-page">
    <div class="md-page">
      <div class="md-header" :style="$minaStyle(`padding-top: ${headerPaddingTop}rpx;`)">
        <div class="md-title">{{title}}</div>
        <div class="md-sub">{{subTitle}}</div>
      </div>

      <div class="md-search">
        <div class="md-search-box">
          <span class="md-search-icon">🔍</span>
          <input class="md-search-input" :value="searchKeyword" placeholder="搜索饮品名称 / 分类" data-mina-placeholder="md-search-ph" enterkeyhint="search" @input="onSearchInput($minaEvent($event, {}))" @keydown.enter="onSearchConfirm($minaEvent($event, {}))">
          <div v-if="searchKeyword" class="md-search-clear" @pointerdown="$minaHover($event, 'clear-hover', true)" @pointerup="$minaHover($event, 'clear-hover', false)" @pointerleave="$minaHover($event, 'clear-hover', false)" @pointercancel="$minaHover($event, 'clear-hover', false)" @click="onClearSearch($minaEvent($event, {}))">✕</div>
        </div>
      </div>

      <div v-if="!isSearching" class="md-tabs" :style="$minaStyle('overflow-x:auto;')">
        <div v-for="(item, index) in categories" :key="item.id" :class="'md-tab ' + (activeCategoryId === item.id ? 'md-tab-active' : '')" @pointerdown="$minaHover($event, 'tab-hover', true)" @pointerup="$minaHover($event, 'tab-hover', false)" @pointerleave="$minaHover($event, 'tab-hover', false)" @pointercancel="$minaHover($event, 'tab-hover', false)" @click="onTapCategory($minaEvent($event, {id: item.id}))" :data-id="item.id">{{item.name}}</div>
      </div>

      <div class="md-list" :style="$minaStyle('overflow-y:auto;' + (false ? '' : 'scrollbar-width:none'))">
        <div class="md-grid">
          <div v-for="(item, index) in items" :key="item.id" class="md-item" @pointerdown="$minaHover($event, 'item-hover', true)" @pointerup="$minaHover($event, 'item-hover', false)" @pointerleave="$minaHover($event, 'item-hover', false)" @pointercancel="$minaHover($event, 'item-hover', false)" @click="onTapDrink($minaEvent($event, {item: item}))" :data-item="item">
            <img alt="" class="md-img" :src="item.imageUrl" :style="$minaStyle('object-fit:cover')">
            <div class="md-name">{{item.name}}</div>
            <div v-if="item.description" class="md-desc">{{item.description}}</div>
            <div class="md-foot">
              <div class="md-price">¥{{item.price}}</div>
              <div class="md-cat-tag">{{item.categoryName}}</div>
            </div>
          </div>
        </div>
        <div v-if="items.length === 0" class="md-empty">没有找到相关饮品～</div>
        <div class="md-bottom safe-area-bottom"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { setData, event, style, hover } from '../runtime.js';
import { wx, getCurrentPages, registerPage, unregisterPage } from '../navigation.js';
import __minaDependency0 from '../modules/63040dd7791eccfc1779db735fbd5c7a37c5d084249e688123eb6366f718d2a2.js';

const { buildCatalog, CATEGORIES } = __minaDependency0;
const CATALOG_VERSION = 3;

function loadCatalog() {
  const cached = wx.getStorageSync('drinks_catalog');
  const version = wx.getStorageSync('drinks_catalog_version');
  if (cached && cached.length && version === CATALOG_VERSION) return cached;
  const fresh = buildCatalog();
  try {
    wx.setStorageSync('drinks_catalog', fresh);
    wx.setStorageSync('drinks_catalog_version', CATALOG_VERSION);
  } catch (e) {}
  return fresh;
}

function calcHeaderPaddingTop() {
  try {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const statusBar = (info && info.statusBarHeight) || 20;
    let capsuleBottom = statusBar + 44;
    if (wx.getMenuButtonBoundingClientRect) {
      const rect = wx.getMenuButtonBoundingClientRect();
      if (rect && rect.bottom) capsuleBottom = rect.bottom + 8;
    }
    const winWidth = (info && info.windowWidth) || 375;
    return Math.max(Math.round(capsuleBottom * 750 / winWidth), 64);
  } catch (e) {
    return 88;
  }
}

export default {
  props: ['minaQuery', 'minaId'],
  data() {
    return {
      categories: [],
      activeCategoryId: 0,
      items: [],
      title: '全部饮品',
      subTitle: '',
      searchKeyword: '',
      isSearching: false,
      headerPaddingTop: 88
    };
  },
  created() {
    registerPage(this.minaId, this);
    if (this.onLoad) this.onLoad(this.minaQuery || {});
  },
  mounted() {
    if (this.onShow) this.onShow();
  },
  beforeDestroy() {
    if (this.onUnload) this.onUnload();
    unregisterPage(this.minaId);
  },
  methods: {
    $minaSetData: setData,
    $minaEvent: event,
    $minaStyle: style,
    $minaHover: hover,
    onLoad(query) {
      this.$minaSetData({ headerPaddingTop: calcHeaderPaddingTop() });

      const keyword = query && query.keyword ? String(query.keyword) : '';

      try {
        const app = getApp();
        if (app && app.takeAgentHandoff) {
          const handoff = app.takeAgentHandoff(this.getPageId());
          if (handoff) console.log('[home] handoff', handoff);
        }
      } catch (e) {}

      const catalog = loadCatalog();
      this._catalog = catalog;
      const categories = [{ id: 0, name: '全部' }].concat(CATEGORIES);

      let items = catalog;
      let title = '全部饮品';
      let subTitle = `共 ${catalog.length} 款`;
      let searchKeyword = '';
      let isSearching = false;

      if (keyword) {
        const kw = keyword.toLowerCase();
        items = catalog.filter(d =>
          d.name.toLowerCase().includes(kw) ||
          d.categoryName.toLowerCase().includes(kw) ||
          (d.description || '').toLowerCase().includes(kw)
        );
        title = `「${keyword}」搜索结果`;
        subTitle = `共 ${items.length} 款`;
        searchKeyword = keyword;
        isSearching = true;
      }

      this.$minaSetData({ categories, activeCategoryId: 0, items, title, subTitle, searchKeyword, isSearching });
    },
    onSearchInput(e) {
      this.$minaSetData({ searchKeyword: e.detail.value });
    },
    onSearchConfirm() {
      this.runSearch();
    },
    runSearch() {
      const kw = (this.$data.searchKeyword || '').trim();
      if (!kw) {
        this.onClearSearch();
        return;
      }
      const lower = kw.toLowerCase();
      const items = this._catalog.filter(d =>
        d.name.toLowerCase().includes(lower) ||
        d.categoryName.toLowerCase().includes(lower) ||
        (d.description || '').toLowerCase().includes(lower)
      );
      this.$minaSetData({
        isSearching: true,
        items,
        title: `「${kw}」搜索结果`,
        subTitle: `共 ${items.length} 款`
      });
    },
    onClearSearch() {
      this.$minaSetData({
        searchKeyword: '',
        isSearching: false,
        activeCategoryId: 0,
        items: this._catalog,
        title: '全部饮品',
        subTitle: `共 ${this._catalog.length} 款`
      });
    },
    onTapCategory(e) {
      const id = Number(e.currentTarget.dataset.id);
      const items = id === 0
        ? this._catalog
        : this._catalog.filter(d => d.categoryId === id);
      this.$minaSetData({ activeCategoryId: id, items, subTitle: `共 ${items.length} 款` });
    },
    onTapDrink(e) {
      const item = e.currentTarget.dataset.item;
      if (!item) return;
      wx.navigateTo({ url: `/packageWeStoreCoffee/pages/sku-picker/sku-picker?drinkId=${item.id}` });
    }
  }
};
</script>

<style scoped>
.minabridge-page {
  background-color: #FFF8F0;
  height: 100%;
  overflow-x: hidden;
}

.md-page, [data-mina-placeholder~="md-page"]::placeholder {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  background: linear-gradient(180deg, #FFF8F0 0%, #F5EFE6 100%);
}

.md-header, [data-mina-placeholder~="md-header"]::placeholder {
  padding: 4.266666666666667vw 4.266666666666667vw 1.6vw;
  position: relative;
}

.md-ai-entry, [data-mina-placeholder~="md-ai-entry"]::placeholder {
  position: absolute;
  right: 4.266666666666667vw;
  bottom: 1.6vw;
  padding: 1.0666666666666667vw 2.6666666666666665vw;
  background: #5C3A21;
  color: #FFF;
  font-size: 2.933333333333333vw;
  border-radius: 133.2vw;
  letter-spacing: 0.06666666666666667vw;
  box-shadow: 0 0.26666666666666666vw 0.8vw rgba(92, 58, 33, 0.25);
}

.md-ai-entry-hover, [data-mina-placeholder~="md-ai-entry-hover"]::placeholder { opacity: 0.75; }

.md-title, [data-mina-placeholder~="md-title"]::placeholder {
  font-size: 5.333333333333333vw;
  font-weight: 700;
  color: #2A1810;
  letter-spacing: 0.13333333333333333vw;
}

.md-sub, [data-mina-placeholder~="md-sub"]::placeholder {
  font-size: 2.933333333333333vw;
  color: #A89180;
  margin-top: 0.5333333333333333vw;
}

.md-search, [data-mina-placeholder~="md-search"]::placeholder {
  padding: 1.0666666666666667vw 3.2vw 0.5333333333333333vw;
  flex-shrink: 0;
}

.md-search-box, [data-mina-placeholder~="md-search-box"]::placeholder {
  display: flex;
  align-items: center;
  height: 9.6vw;
  padding: 0 3.2vw;
  background: #FFFFFF;
  border-radius: 133.2vw;
  box-shadow: 0 0.26666666666666666vw 1.0666666666666667vw rgba(92, 58, 33, 0.05);
}

.md-search-icon, [data-mina-placeholder~="md-search-icon"]::placeholder {
  font-size: 3.7333333333333334vw;
  margin-right: 1.6vw;
  opacity: 0.6;
}

.md-search-input, [data-mina-placeholder~="md-search-input"]::placeholder {
  flex: 1;
  font-size: 3.7333333333333334vw;
  color: #2A1810;
  height: 100%;
}

.md-search-ph, [data-mina-placeholder~="md-search-ph"]::placeholder {
  color: #B8A898;
}

.md-search-clear, [data-mina-placeholder~="md-search-clear"]::placeholder {
  width: 5.333333333333333vw;
  height: 5.333333333333333vw;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #EFE7DC;
  color: #8B7A68;
  font-size: 3.2vw;
  margin-left: 1.0666666666666667vw;
}

.clear-hover, [data-mina-placeholder~="clear-hover"]::placeholder { opacity: 0.7; }

.md-tabs, [data-mina-placeholder~="md-tabs"]::placeholder {
  white-space: nowrap;
  padding: 1.6vw 3.2vw;
  flex-shrink: 0;
}

.md-tab, [data-mina-placeholder~="md-tab"]::placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1.8666666666666667vw 3.7333333333333334vw;
  margin-right: 2.1333333333333333vw;
  background: #FFFFFF;
  border-radius: 133.2vw;
  font-size: 3.466666666666667vw;
  color: #6B5544;
  box-shadow: 0 0.26666666666666666vw 1.0666666666666667vw rgba(92, 58, 33, 0.05);
}

.md-tab-active, [data-mina-placeholder~="md-tab-active"]::placeholder {
  background: linear-gradient(135deg, #8B5E3C 0%, #5C3A21 100%);
  color: #FFFFFF;
  font-weight: 600;
}

.tab-hover, [data-mina-placeholder~="tab-hover"]::placeholder { opacity: 0.85; }

.md-list, [data-mina-placeholder~="md-list"]::placeholder {
  flex: 1;
  padding: 1.0666666666666667vw 3.2vw 0;
  box-sizing: border-box;
}

.md-grid, [data-mina-placeholder~="md-grid"]::placeholder {
  display: flex;
  flex-wrap: wrap;
  gap: 2.6666666666666665vw;
  padding-top: 1.6vw;
}

.md-item, [data-mina-placeholder~="md-item"]::placeholder {
  width: calc((100% - 2.6666666666666665vw) / 2);
  background: #FFFFFF;
  border-radius: 3.2vw;
  padding: 2.1333333333333333vw;
  box-sizing: border-box;
  box-shadow: 0 0.5333333333333333vw 2.1333333333333333vw rgba(92, 58, 33, 0.06);
  display: flex;
  flex-direction: column;
}

.item-hover, [data-mina-placeholder~="item-hover"]::placeholder {
  opacity: 0.85;
  transform: scale(0.98);
}

.md-img, [data-mina-placeholder~="md-img"]::placeholder {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 2.1333333333333333vw;
  background-color: #F5EFE6;
  margin-bottom: 1.6vw;
}

.md-name, [data-mina-placeholder~="md-name"]::placeholder {
  font-size: 3.7333333333333334vw;
  font-weight: 600;
  color: #2A1810;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.md-desc, [data-mina-placeholder~="md-desc"]::placeholder {
  font-size: 2.933333333333333vw;
  color: #6B5544;
  margin-top: 0.5333333333333333vw;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.md-foot, [data-mina-placeholder~="md-foot"]::placeholder {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1.6vw;
}

.md-price, [data-mina-placeholder~="md-price"]::placeholder {
  font-size: 4.266666666666667vw;
  font-weight: 700;
  color: #5C3A21;
}

.md-cat-tag, [data-mina-placeholder~="md-cat-tag"]::placeholder {
  font-size: 2.6666666666666665vw;
  color: #8B5E3C;
  background: #FFF8F0;
  padding: 0.5333333333333333vw 1.6vw;
  border-radius: 1.0666666666666667vw;
}

.md-empty, [data-mina-placeholder~="md-empty"]::placeholder {
  text-align: center;
  font-size: 3.466666666666667vw;
  color: #A89180;
  padding: 10.666666666666666vw 0;
}

.md-bottom, [data-mina-placeholder~="md-bottom"]::placeholder {
  height: 5.333333333333333vw;
}

.safe-area-bottom, [data-mina-placeholder~="safe-area-bottom"]::placeholder {
  padding-bottom: calc(env(safe-area-inset-bottom) + 2.1333333333333333vw);
}

@media (prefers-color-scheme: dark) {
  .minabridge-page {
    background-color: #121212;
  }
  .md-page, [data-mina-placeholder~="md-page"]::placeholder {
    background: linear-gradient(180deg, #121212 0%, #1A1510 100%);
  }
  .md-title, [data-mina-placeholder~="md-title"]::placeholder {
    color: #E8E0D8;
  }
  .md-sub, [data-mina-placeholder~="md-sub"]::placeholder {
    color: #7A6E62;
  }
  .md-search-box, [data-mina-placeholder~="md-search-box"]::placeholder {
    background: #1E1E1E;
    box-shadow: 0 0.26666666666666666vw 1.0666666666666667vw rgba(0, 0, 0, 0.2);
  }
  .md-search-input, [data-mina-placeholder~="md-search-input"]::placeholder {
    color: #E8E0D8;
  }
  .md-search-ph, [data-mina-placeholder~="md-search-ph"]::placeholder {
    color: #6E6258;
  }
  .md-search-clear, [data-mina-placeholder~="md-search-clear"]::placeholder {
    background: #2E2A24;
    color: #9E8E7E;
  }
  .md-tab, [data-mina-placeholder~="md-tab"]::placeholder {
    background: #1E1E1E;
    color: #9E8E7E;
    box-shadow: 0 0.26666666666666666vw 1.0666666666666667vw rgba(0, 0, 0, 0.2);
  }
  .md-tab-active, [data-mina-placeholder~="md-tab-active"]::placeholder {
    background: linear-gradient(135deg, #A07050 0%, #7A5030 100%);
    color: #FFFFFF;
  }
  .md-item, [data-mina-placeholder~="md-item"]::placeholder {
    background: #1E1E1E;
    box-shadow: 0 0.5333333333333333vw 2.1333333333333333vw rgba(0, 0, 0, 0.2);
  }
  .md-img, [data-mina-placeholder~="md-img"]::placeholder {
    background-color: #2A2A2A;
  }
  .md-name, [data-mina-placeholder~="md-name"]::placeholder {
    color: #E8E0D8;
  }
  .md-desc, [data-mina-placeholder~="md-desc"]::placeholder {
    color: #9E8E7E;
  }
  .md-price, [data-mina-placeholder~="md-price"]::placeholder {
    color: #D4A574;
  }
  .md-cat-tag, [data-mina-placeholder~="md-cat-tag"]::placeholder {
    color: #D4A574;
    background: #2A2218;
  }
  .md-empty, [data-mina-placeholder~="md-empty"]::placeholder {
    color: #7A6E62;
  }
}
</style>

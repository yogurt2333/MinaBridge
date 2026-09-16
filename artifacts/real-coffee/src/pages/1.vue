<template>
  <div class="minabridge-page">
    <div class="sp-page">
      <div class="nav-back" @pointerdown="$minaHover($event, 'nav-back-hover', true)" @pointerup="$minaHover($event, 'nav-back-hover', false)" @pointerleave="$minaHover($event, 'nav-back-hover', false)" @pointercancel="$minaHover($event, 'nav-back-hover', false)" @click="onTapBack($minaEvent($event, {}))" :style="$minaStyle('top: ' + (navBackTop) + 'rpx; width: ' + (navBackSize) + 'rpx; height: ' + (navBackSize) + 'rpx;')">
        <span class="nav-back-arrow"></span>
      </div>
      <div class="sp-header" :style="$minaStyle('padding-top: ' + (headerPaddingTop) + 'rpx;')">
        <img alt="" class="sp-thumb" :src="(drink.imageUrl)" :style="$minaStyle('object-fit:cover')">
        <div class="sp-head-info">
          <div class="sp-name">{{drink.name}}</div>
          <div v-if="(drink.description)" class="sp-desc">{{drink.description}}</div>
          <div class="sp-base-price">基础价 ¥{{drink.price}}</div>
        </div>
      </div>

      <div class="sp-body" :style="$minaStyle(((true) ? 'overflow-y:auto;' : '') + ';' + ((false) ? '' : 'scrollbar-width:none'))">
        <div v-for="(dim, index) in (dimensions)" :key="dim['key']" class="sp-section">
          <div class="sp-section-title">
            <span class="sp-label">{{dim.label}}</span>
            <span v-if="(dim.multiple)" class="sp-label-hint">可多选</span>
          </div>
          <div class="sp-options">
            <div v-for="(opt, index) in (dim.options)" :key="opt['value']" :class="'sp-option ' + (opt._selected ? 'sp-option-active' : '')" @pointerdown="$minaHover($event, 'opt-hover', true)" @pointerup="$minaHover($event, 'opt-hover', false)" @pointerleave="$minaHover($event, 'opt-hover', false)" @pointercancel="$minaHover($event, 'opt-hover', false)" @click="onTapOption($minaEvent($event, {'dimKey': (dim.key),'value': (opt.value)}) )" :data-dim-key="(dim.key)" :data-value="(opt.value)">
              <span class="sp-opt-label">{{opt.label}}</span>
              <span v-if="(opt.extraPrice)" class="sp-opt-extra">+¥{{opt.extraPrice}}</span>
            </div>
          </div>
        </div>
        <div class="sp-bottom-spacer"></div>
      </div>

      <div class="sp-footer safe-area-bottom">
        <div class="sp-summary">
          <div class="sp-summary-line">
            <span class="sp-summary-spec">{{specTextPreview}}</span>
          </div>
          <div class="sp-summary-price-row">
            <span class="sp-summary-price">¥{{totalPrice}}</span>
            <span v-if="(extraPrice)" class="sp-summary-extra">（含加价 ¥{{extraPrice}}）</span>
          </div>
        </div>
        <template v-if="(hasActiveOrder)">
          <div class="sp-confirm sp-confirm-secondary" @pointerdown="$minaHover($event, 'btn-hover', true)" @pointerup="$minaHover($event, 'btn-hover', false)" @pointerleave="$minaHover($event, 'btn-hover', false)" @pointercancel="$minaHover($event, 'btn-hover', false)" @click="onTapConfirm($minaEvent($event, {'mode': 'new'}))" :data-mode="'new'">
            <span class="sp-confirm-text sp-confirm-text-secondary">新建订单</span>
          </div>
          <div class="sp-confirm" @pointerdown="$minaHover($event, 'btn-hover', true)" @pointerup="$minaHover($event, 'btn-hover', false)" @pointerleave="$minaHover($event, 'btn-hover', false)" @pointercancel="$minaHover($event, 'btn-hover', false)" @click="onTapConfirm($minaEvent($event, {'mode': 'append'}))" :data-mode="'append'">
            <span class="sp-confirm-text">加入当前订单（{{activeItemCount}}件）</span>
          </div>
        </template>
        <div v-else class="sp-confirm" @pointerdown="$minaHover($event, 'btn-hover', true)" @pointerup="$minaHover($event, 'btn-hover', false)" @pointerleave="$minaHover($event, 'btn-hover', false)" @pointercancel="$minaHover($event, 'btn-hover', false)" @click="onTapConfirm($minaEvent($event, {'mode': 'append'}))" :data-mode="'append'">
          <span class="sp-confirm-text">加入订单</span>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { setData, event, style, hover } from '../runtime.js';
import { wx, getCurrentPages, registerPage, unregisterPage } from '../navigation.js';
import __minaDependency0 from '../modules/63040dd7791eccfc1779db735fbd5c7a37c5d084249e688123eb6366f718d2a2.js';
const { buildCatalog } = __minaDependency0
const CATALOG_VERSION = 3
const DEFAULT_SINGLE_SPEC = { temperature: 'ice', sugar: 'normal', cupSize: 'medium' }
function loadCatalog() {
  const cached = wx.getStorageSync('drinks_catalog')
  const version = wx.getStorageSync('drinks_catalog_version')
  if (cached && cached.length && version === CATALOG_VERSION) return cached
  const fresh = buildCatalog()
  try {
    wx.setStorageSync('drinks_catalog', fresh)
    wx.setStorageSync('drinks_catalog_version', CATALOG_VERSION)
  } catch (e) {}
  return fresh
}
function calcHeaderPaddingTop() {
  try {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const statusBar = (info && info.statusBarHeight) || 20
    let capsuleBottom = statusBar + 44
    if (wx.getMenuButtonBoundingClientRect) {
      const rect = wx.getMenuButtonBoundingClientRect()
      if (rect && rect.bottom) capsuleBottom = rect.bottom + 8
    }
    const winWidth = (info && info.windowWidth) || 375
    return Math.max(Math.round(capsuleBottom * 750 / winWidth), 64)
  } catch (e) {
    return 88
  }
}
function calcNavBack() {
  try {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const winWidth = (info && info.windowWidth) || 375
    const px2rpx = (px) => Math.round(px * 750 / winWidth)
    let top = ((info && info.statusBarHeight) || 20) + 6
    let size = 32
    if (wx.getMenuButtonBoundingClientRect) {
      const rect = wx.getMenuButtonBoundingClientRect()
      if (rect && rect.top) {
        top = rect.top
        size = rect.height || 32
      }
    }
    return { top: px2rpx(top), size: px2rpx(size) }
  } catch (e) {
    return { top: 88, size: 64 }
  }
}
function getOpenid() {
  const userInfo = wx.getStorageSync('userInfo')
  return (userInfo && userInfo.openid) ? userInfo.openid : 'anonymous'
}
export default { props: ['minaQuery','minaId'], data() { return {
    drink: null,
    dimensions: [],
    totalPrice: 0,
    extraPrice: 0,
    specTextPreview: '',
    headerPaddingTop: 88,
    navBackTop: 88,
    navBackSize: 64,
    hasActiveOrder: false,
    activeItemCount: 0
  }; }, created() { registerPage(this.minaId,this); if(this.onLoad) this.onLoad(this.minaQuery || {}); }, mounted() { if(this.onShow) this.onShow(); }, beforeDestroy() { if(this.onUnload) this.onUnload(); unregisterPage(this.minaId); }, methods: { $minaSetData: setData, $minaEvent: event, $minaStyle: style, $minaHover: hover, onLoad(query) {
    const nb = calcNavBack()
    this.$minaSetData({ headerPaddingTop: calcHeaderPaddingTop(), navBackTop: nb.top, navBackSize: nb.size })

    let drinkId = query && query.drinkId ? Number(query.drinkId) : 0

    let payload = null
    try {
      const app = getApp()
      if (app && app.takeAgentHandoff) {
        const handoff = app.takeAgentHandoff(this.getPageId())
        payload = handoff && handoff.payload
        if (handoff) {
          console.log('[sku-picker] handoff', handoff)
          if (!drinkId && payload && payload.drinkId) drinkId = Number(payload.drinkId)
        }
      }
    } catch (e) {}

    if (!drinkId) {
      try { drinkId = Number(wx.getStorageSync('current_sku_drink_id')) || 0 } catch (e) {}
    }

    let drink = null
    if (payload && payload.drinkId && Number(payload.drinkId) === drinkId && payload.skuSchema) {
      drink = {
        id: payload.drinkId,
        name: payload.name,
        price: payload.price,
        description: payload.description,
        categoryName: payload.categoryName,
        imageUrl: payload.imageUrl,
        skuSchema: payload.skuSchema
      }
    } else {
      const catalog = loadCatalog()
      drink = catalog.find(d => d.id === drinkId)
    }

    if (!drink) {
      wx.showToast({ title: '商品不存在', icon: 'none' })
      return
    }

    const schema = drink.skuSchema || { dimensions: [] }
    const dims = schema.dimensions.map(dim => {
      const defVal = DEFAULT_SINGLE_SPEC[dim.key] || (dim.options[0] && dim.options[0].value)
      return {
        key: dim.key,
        label: dim.label,
        multiple: !!dim.multiple,
        selectedValue: dim.multiple ? null : defVal,
        selectedValues: dim.multiple ? [] : null,
        options: dim.options
      }
    })
    this.$minaSetData({ drink, dimensions: dims })
    this._recalc()
    this._checkActiveOrder()
  },
_checkActiveOrder() {
    try {
      const openid = getOpenid()
      const orders = wx.getStorageSync(`orders_${openid}`) || []
      const activeId = wx.getStorageSync(`active_order_${openid}`)
      const order = activeId ? orders.find(o => o.orderId === activeId) : null
      const items = order && order.status !== 'paid' && Array.isArray(order.items) ? order.items : []
      this.$minaSetData({ hasActiveOrder: items.length > 0, activeItemCount: items.length })
    } catch (e) {
      this.$minaSetData({ hasActiveOrder: false, activeItemCount: 0 })
    }
  },
onTapBack() {
    const pages = getCurrentPages()
    if (pages && pages.length > 1) {
      wx.navigateBack({ delta: 1 })
    } else {
      wx.reLaunch({ url: '/packageWeStoreCoffee/pages/home/home' })
    }
  },
onTapOption(e) {
    const { dimKey, value } = e.currentTarget.dataset
    const dims = this.$data.dimensions.map(d => {
      if (d.key !== dimKey) return d
      if (d.multiple) {
        const list = [...(d.selectedValues || [])]
        const idx = list.indexOf(value)
        if (idx >= 0) list.splice(idx, 1)
        else list.push(value)
        return { ...d, selectedValues: list }
      }
      return { ...d, selectedValue: value }
    })
    this.$minaSetData({ dimensions: dims })
    this._recalc()
  },
_recalc() {
    const { drink, dimensions } = this.$data
    if (!drink) return
    let extra = 0
    const labels = []
    const nextDims = dimensions.map(dim => {
      const options = dim.options.map(opt => {
        const selected = dim.multiple
          ? (dim.selectedValues || []).indexOf(opt.value) >= 0
          : dim.selectedValue === opt.value
        return Object.assign({}, opt, { _selected: selected })
      })
      if (dim.multiple) {
        const names = []
        for (const opt of options) {
          if (opt._selected) {
            extra += (opt.extraPrice || 0)
            names.push(opt.label)
          }
        }
        if (names.length) labels.push(`${dim.label}:${names.join('+')}`)
      } else {
        const opt = options.find(o => o._selected)
        if (opt) {
          extra += (opt.extraPrice || 0)
          labels.push(opt.label)
        }
      }
      return Object.assign({}, dim, { options })
    })
    this.$minaSetData({
      dimensions: nextDims,
      extraPrice: extra,
      totalPrice: drink.price + extra,
      specTextPreview: labels.join(' / ')
    })
  },
onTapConfirm(e) {
    const mode = (e && e.currentTarget && e.currentTarget.dataset.mode) || 'append'
    const { drink, dimensions, specTextPreview, totalPrice, extraPrice } = this.$data
    if (!drink) return
    for (const dim of dimensions) {
      if (!dim.multiple && !dim.selectedValue) {
        wx.showToast({ title: `请选择${dim.label}`, icon: 'none' })
        return
      }
    }

    const item = {
      itemId: 'IT' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1e4).toString(36).toUpperCase(),
      drinkId: drink.id,
      drinkName: drink.name,
      imageUrl: drink.imageUrl,
      specText: specTextPreview,
      basePrice: drink.price,
      extraPrice,
      totalPrice
    }

    let orderId
    try {
      const openid = getOpenid()
      const ordersKey = `orders_${openid}`
      const activeKey = `active_order_${openid}`
      const orders = wx.getStorageSync(ordersKey) || []
      const activeId = wx.getStorageSync(activeKey)

      let order = null
      if (mode !== 'new' && activeId) {
        const found = orders.find(o => o.orderId === activeId)
        if (found && found.status !== 'paid') order = found
      }

      if (order) {
        order.items = Array.isArray(order.items) ? order.items : []
        order.items.push(item)
      } else {
        order = {
          orderId: 'LOCAL_' + Date.now(),
          items: [item],
          status: 'pending',
          createTime: new Date().toISOString()
        }
        orders.push(order)
      }
      order.itemCount = order.items.length
      order.totalPrice = order.items.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0)

      const idx = orders.findIndex(o => o.orderId === order.orderId)
      if (idx >= 0) orders[idx] = order
      wx.setStorageSync(ordersKey, orders)
      wx.setStorageSync(activeKey, order.orderId)
      orderId = order.orderId
    } catch (err) {
      console.warn('[sku-picker] save order fail', err)
      orderId = 'LOCAL_' + Date.now()
    }

    wx.navigateTo({ url: `/packageWeStoreCoffee/pages/checkout/checkout?orderId=${orderId}` })
  } } };
</script>
<style scoped>
.minabridge-page {
  background-color: #FFF8F0;
  height: 100%;
  overflow-x: hidden;
}

.sp-page, [data-mina-placeholder~="sp-page"]::placeholder {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  background: linear-gradient(180deg, #FFF8F0 0%, #F5EFE6 100%);
}

.nav-back, [data-mina-placeholder~="nav-back"]::placeholder {
  position: fixed;
  left: 3.2vw;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 0.26666666666666666vw 1.3333333333333333vw rgba(92, 58, 33, 0.12);
}

.nav-back-arrow, [data-mina-placeholder~="nav-back-arrow"]::placeholder {
  width: 2.1333333333333333vw;
  height: 2.1333333333333333vw;
  border-left: 0.8vw solid #2A1810;
  border-bottom: 0.8vw solid #2A1810;
  transform: translateX(0.4vw) rotate(45deg);
}

.nav-back-hover, [data-mina-placeholder~="nav-back-hover"]::placeholder { opacity: 0.7; }

@media (prefers-color-scheme: dark) {
  .nav-back, [data-mina-placeholder~="nav-back"]::placeholder {
    background: rgba(30, 30, 30, 0.92);
    box-shadow: 0 0.26666666666666666vw 1.3333333333333333vw rgba(0, 0, 0, 0.3);
  }
  .nav-back-arrow, [data-mina-placeholder~="nav-back-arrow"]::placeholder {
    border-left-color: #E8E0D8;
    border-bottom-color: #E8E0D8;
  }
}

.sp-header, [data-mina-placeholder~="sp-header"]::placeholder {
  display: flex;
  padding: 4.266666666666667vw;
  background: #FFFFFF;
  border-bottom: 0.26666666666666666vw solid #EDE3D4;
  flex-shrink: 0;
}

.sp-thumb, [data-mina-placeholder~="sp-thumb"]::placeholder {
  width: 18.666666666666668vw;
  height: 18.666666666666668vw;
  border-radius: 2.6666666666666665vw;
  background-color: #F5EFE6;
  flex-shrink: 0;
}

.sp-head-info, [data-mina-placeholder~="sp-head-info"]::placeholder {
  margin-left: 3.2vw;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.sp-name, [data-mina-placeholder~="sp-name"]::placeholder {
  font-size: 4.533333333333333vw;
  font-weight: 700;
  color: #2A1810;
}

.sp-desc, [data-mina-placeholder~="sp-desc"]::placeholder {
  font-size: 3.2vw;
  color: #6B5544;
  margin-top: 1.0666666666666667vw;
  line-height: 1.4;
}

.sp-base-price, [data-mina-placeholder~="sp-base-price"]::placeholder {
  font-size: 3.2vw;
  color: #8B5E3C;
  margin-top: 1.3333333333333333vw;
}

.sp-body, [data-mina-placeholder~="sp-body"]::placeholder {
  flex: 1;
  padding: 2.6666666666666665vw 4.266666666666667vw 0;
  box-sizing: border-box;
}

.sp-section, [data-mina-placeholder~="sp-section"]::placeholder {
  margin-bottom: 3.7333333333333334vw;
}

.sp-section-title, [data-mina-placeholder~="sp-section-title"]::placeholder {
  display: flex;
  align-items: baseline;
  margin-bottom: 2.1333333333333333vw;
}

.sp-label, [data-mina-placeholder~="sp-label"]::placeholder {
  font-size: 3.7333333333333334vw;
  font-weight: 600;
  color: #2A1810;
}

.sp-label-hint, [data-mina-placeholder~="sp-label-hint"]::placeholder {
  font-size: 2.933333333333333vw;
  color: #A89180;
  margin-left: 1.6vw;
}

.sp-options, [data-mina-placeholder~="sp-options"]::placeholder {
  display: flex;
  flex-wrap: wrap;
  gap: 2.1333333333333333vw;
}

.sp-option, [data-mina-placeholder~="sp-option"]::placeholder {
  display: inline-flex;
  align-items: center;
  padding: 2.1333333333333333vw 3.2vw;
  background: #FFFFFF;
  border: 0.26666666666666666vw solid #EDE3D4;
  border-radius: 133.2vw;
  font-size: 3.466666666666667vw;
  color: #2A1810;
}

.sp-option-active, [data-mina-placeholder~="sp-option-active"]::placeholder {
  background: linear-gradient(135deg, #8B5E3C 0%, #5C3A21 100%);
  border-color: transparent;
  color: #FFFFFF;
}

.opt-hover, [data-mina-placeholder~="opt-hover"]::placeholder { opacity: 0.85; }

.sp-opt-label, [data-mina-placeholder~="sp-opt-label"]::placeholder {
  line-height: 1;
}

.sp-opt-extra, [data-mina-placeholder~="sp-opt-extra"]::placeholder {
  font-size: 2.933333333333333vw;
  margin-left: 1.0666666666666667vw;
  color: inherit;
  opacity: 0.85;
}

.sp-bottom-spacer, [data-mina-placeholder~="sp-bottom-spacer"]::placeholder {
  height: 5.333333333333333vw;
}

.sp-footer, [data-mina-placeholder~="sp-footer"]::placeholder {
  background: #FFFFFF;
  border-top: 0.26666666666666666vw solid #EDE3D4;
  padding: 2.6666666666666665vw 4.266666666666667vw;
  display: flex;
  align-items: center;
  gap: 2.6666666666666665vw;
}

.safe-area-bottom, [data-mina-placeholder~="safe-area-bottom"]::placeholder {
  padding-bottom: calc(env(safe-area-inset-bottom) + 2.6666666666666665vw);
}

.sp-summary, [data-mina-placeholder~="sp-summary"]::placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sp-summary-line, [data-mina-placeholder~="sp-summary-line"]::placeholder {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sp-summary-spec, [data-mina-placeholder~="sp-summary-spec"]::placeholder {
  font-size: 2.933333333333333vw;
  color: #6B5544;
}

.sp-summary-price-row, [data-mina-placeholder~="sp-summary-price-row"]::placeholder {
  display: flex;
  align-items: baseline;
  margin-top: 0.5333333333333333vw;
}

.sp-summary-price, [data-mina-placeholder~="sp-summary-price"]::placeholder {
  font-size: 5.333333333333333vw;
  font-weight: 800;
  color: #5C3A21;
}

.sp-summary-extra, [data-mina-placeholder~="sp-summary-extra"]::placeholder {
  font-size: 2.6666666666666665vw;
  color: #A89180;
  margin-left: 1.3333333333333333vw;
}

.sp-confirm, [data-mina-placeholder~="sp-confirm"]::placeholder {
  padding: 2.933333333333333vw 5.333333333333333vw;
  border-radius: 133.2vw;
  background: linear-gradient(135deg, #8B5E3C 0%, #5C3A21 100%);
  flex-shrink: 0;
}

.sp-confirm-secondary, [data-mina-placeholder~="sp-confirm-secondary"]::placeholder {
  background: #FFFFFF;
  border: 0.26666666666666666vw solid #C9A88A;
  padding: 2.6666666666666665vw 4.266666666666667vw;
}

.btn-hover, [data-mina-placeholder~="btn-hover"]::placeholder { opacity: 0.85; }

.sp-confirm-text, [data-mina-placeholder~="sp-confirm-text"]::placeholder {
  color: #FFFFFF;
  font-size: 3.7333333333333334vw;
  font-weight: 700;
  letter-spacing: 0.26666666666666666vw;
}

.sp-confirm-text-secondary, [data-mina-placeholder~="sp-confirm-text-secondary"]::placeholder {
  color: #8B5E3C;
  letter-spacing: 0;
}

@media (prefers-color-scheme: dark) {
  .minabridge-page {
    background-color: #121212;
  }
  .sp-page, [data-mina-placeholder~="sp-page"]::placeholder {
    background: linear-gradient(180deg, #121212 0%, #1A1510 100%);
  }
  .sp-header, [data-mina-placeholder~="sp-header"]::placeholder {
    background: #1E1E1E;
    border-bottom-color: #3E3228;
  }
  .sp-thumb, [data-mina-placeholder~="sp-thumb"]::placeholder {
    background-color: #2A2A2A;
  }
  .sp-name, [data-mina-placeholder~="sp-name"]::placeholder {
    color: #E8E0D8;
  }
  .sp-desc, [data-mina-placeholder~="sp-desc"]::placeholder {
    color: #9E8E7E;
  }
  .sp-base-price, [data-mina-placeholder~="sp-base-price"]::placeholder {
    color: #D4A574;
  }
  .sp-label, [data-mina-placeholder~="sp-label"]::placeholder {
    color: #E8E0D8;
  }
  .sp-label-hint, [data-mina-placeholder~="sp-label-hint"]::placeholder {
    color: #7A6E62;
  }
  .sp-option, [data-mina-placeholder~="sp-option"]::placeholder {
    background: #1E1E1E;
    border-color: #3E3228;
    color: #E8E0D8;
  }
  .sp-option-active, [data-mina-placeholder~="sp-option-active"]::placeholder {
    background: linear-gradient(135deg, #A07050 0%, #7A5030 100%);
    border-color: transparent;
    color: #FFFFFF;
  }
  .sp-footer, [data-mina-placeholder~="sp-footer"]::placeholder {
    background: #1E1E1E;
    border-top-color: #3E3228;
  }
  .sp-summary-spec, [data-mina-placeholder~="sp-summary-spec"]::placeholder {
    color: #9E8E7E;
  }
  .sp-summary-price, [data-mina-placeholder~="sp-summary-price"]::placeholder {
    color: #D4A574;
  }
  .sp-summary-extra, [data-mina-placeholder~="sp-summary-extra"]::placeholder {
    color: #7A6E62;
  }
  .sp-confirm, [data-mina-placeholder~="sp-confirm"]::placeholder {
    background: linear-gradient(135deg, #A07050 0%, #7A5030 100%);
  }
  .sp-confirm-secondary, [data-mina-placeholder~="sp-confirm-secondary"]::placeholder {
    background: #1E1E1E;
    border-color: #6B5038;
  }
  .sp-confirm-text-secondary, [data-mina-placeholder~="sp-confirm-text-secondary"]::placeholder {
    color: #D4A574;
  }
}
</style>

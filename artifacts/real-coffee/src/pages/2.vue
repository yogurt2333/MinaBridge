<template>
  <div class="minabridge-page">
    <div class="ck-page">
      <div class="nav-back" @pointerdown="$minaHover($event, 'nav-back-hover', true)" @pointerup="$minaHover($event, 'nav-back-hover', false)" @pointerleave="$minaHover($event, 'nav-back-hover', false)" @pointercancel="$minaHover($event, 'nav-back-hover', false)" @click="onTapBack($minaEvent($event, {}))" :style="$minaStyle('top: ' + (navBackTop) + 'rpx; width: ' + (navBackSize) + 'rpx; height: ' + (navBackSize) + 'rpx;')">
        <span class="nav-back-arrow"></span>
      </div>
      <div class="ck-header" :style="$minaStyle('padding-top: ' + (headerPaddingTop) + 'rpx;')">
        <div class="ck-title">订单结算</div>
        <div class="ck-sub">从小微对话接力进入 · 在小程序内完成下单</div>
      </div>

      <div class="ck-body" :style="$minaStyle(((true) ? 'overflow-y:auto;' : '') + ';' + ((false) ? '' : 'scrollbar-width:none'))">
        <div class="ck-card">
          <div class="ck-card-title">收货地址</div>
          <div v-if="(address)" class="ck-addr" @pointerdown="$minaHover($event, 'row-hover', true)" @pointerup="$minaHover($event, 'row-hover', false)" @pointerleave="$minaHover($event, 'row-hover', false)" @pointercancel="$minaHover($event, 'row-hover', false)" @click="onTapChooseAddress($minaEvent($event, {}))">
            <div class="ck-addr-line">
              <span class="ck-addr-name">{{address.name}}</span>
              <span class="ck-addr-phone">{{address.phone}}</span>
            </div>
            <div class="ck-addr-detail">{{address.detail}}</div>
          <span>（地址未接入）</span></div>
          <div v-else class="ck-addr-empty" @pointerdown="$minaHover($event, 'row-hover', true)" @pointerup="$minaHover($event, 'row-hover', false)" @pointerleave="$minaHover($event, 'row-hover', false)" @pointercancel="$minaHover($event, 'row-hover', false)" @click="onTapChooseAddress($minaEvent($event, {}))">
            <span class="ck-addr-empty-text">+ 选择收货地址</span>
          <span>（地址未接入）</span></div>
        </div>

        <div class="ck-card" v-if="(order)">
          <div class="ck-card-title">商品信息 · 共{{order.itemCount}}件</div>
          <div v-for="(goods, index) in (displayItems)" :key="goods['index']" class="ck-goods">
            <img alt="" class="ck-thumb" :src="(goods.imageUrl)" :style="$minaStyle('object-fit:cover')">
            <div class="ck-goods-info">
              <div class="ck-goods-name">
                <span>{{goods.drinkName}}</span>
                <span v-if="(goods.qty > 1)" class="ck-goods-qty">x{{goods.qty}}</span>
              </div>
              <div v-if="(goods.specText)" class="ck-goods-spec">{{goods.specText}}</div>
            </div>
            <div class="ck-goods-price">¥{{goods.lineTotal}}</div>
          </div>
          <div class="ck-fee">
            <div class="ck-fee-row ck-fee-total">
              <span>合计</span><span class="ck-fee-total-num">¥{{order.totalPrice}}</span>
            </div>
          </div>
        </div>

        <div v-if="(paid)" class="ck-paid-tip">支付成功，预计 20 分钟内出杯</div>
        <div class="ck-bottom-spacer"></div>
      </div>

      <div class="ck-footer safe-area-bottom">
        <div v-if="(!paid)" class="ck-pay-line">
          <div class="ck-pay-amount">
            <span class="ck-pay-label">实付</span>
            <span class="ck-pay-num">¥{{order.totalPrice}}</span>
          </div>
          <div :class="'ck-pay-btn ' + (paying ? 'ck-pay-btn-disabled' : '')" @pointerdown="$minaHover($event, (paying ? '' : 'btn-hover'), true)" @pointerup="$minaHover($event, (paying ? '' : 'btn-hover'), false)" @pointerleave="$minaHover($event, (paying ? '' : 'btn-hover'), false)" @pointercancel="$minaHover($event, (paying ? '' : 'btn-hover'), false)" @click="onTapPay($minaEvent($event, {}))">
            <span class="ck-pay-btn-text">{{paying ? '支付中...' : '立即支付'}}</span>
          <span>（支付未接入）</span></div>
        </div>
        <div v-else class="ck-pay-btn ck-pay-done" @pointerdown="$minaHover($event, 'btn-hover', true)" @pointerup="$minaHover($event, 'btn-hover', false)" @pointerleave="$minaHover($event, 'btn-hover', false)" @pointercancel="$minaHover($event, 'btn-hover', false)" @click="onTapBackHome($minaEvent($event, {}))">
          <span class="ck-pay-btn-text">完成 · 返回首页</span>
        </div>
      </div>
    </div>
  </div>
</template>
<script>import { setData, event, style, hover } from '../runtime.js';
import { wx, getCurrentPages, registerPage, unregisterPage } from '../navigation.js';
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
function loadOrder(orderId) {
  if (!orderId) return null
  try {
    const orders = wx.getStorageSync(`orders_${getOpenid()}`) || []
    return orders.find(o => o.orderId === orderId) || null
  } catch (e) {
    return null
  }
}
function saveOrder(order) {
  try {
    const key = `orders_${getOpenid()}`
    const orders = wx.getStorageSync(key) || []
    const idx = orders.findIndex(o => o.orderId === order.orderId)
    if (idx >= 0) orders[idx] = order
    else orders.push(order)
    wx.setStorageSync(key, orders)
  } catch (e) {}
}
function normalizeOrder(order) {
  if (!order) return order
  if (!Array.isArray(order.items)) {
    if (order.drinkName || order.drinkId) {
      order.items = [{
        drinkId: order.drinkId,
        drinkName: order.drinkName,
        imageUrl: order.imageUrl,
        specs: order.specs,
        specText: order.specText,
        basePrice: order.basePrice,
        extraPrice: order.extraPrice,
        totalPrice: order.totalPrice
      }]
    } else {
      order.items = []
    }
  }
  order.itemCount = order.items.length
  order.totalPrice = order.items.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0)
  return order
}
function clearActiveOrderId() {
  try { wx.removeStorageSync(`active_order_${getOpenid()}`) } catch (e) {}
}
function buildDisplayItems(order) {
  const items = (order && Array.isArray(order.items)) ? order.items : []
  const map = {}
  const list = []
  items.forEach(it => {
    const key = `${it.drinkName}||${it.specText || ''}`
    if (map[key]) {
      map[key].qty += 1
      map[key].lineTotal += Number(it.totalPrice) || 0
    } else {
      const row = {
        drinkName: it.drinkName,
        specText: it.specText,
        imageUrl: it.imageUrl,
        unitPrice: Number(it.totalPrice) || 0,
        qty: 1,
        lineTotal: Number(it.totalPrice) || 0
      }
      map[key] = row
      list.push(row)
    }
  })
  return list
}
export default { props: ['minaQuery','minaId'], data() { return {
    order: null,
    displayItems: [],
    address: null,
    paying: false,
    paid: false,
    headerPaddingTop: 88,
    navBackTop: 88,
    navBackSize: 64
  }; }, created() { registerPage(this.minaId,this); if(this.onLoad) this.onLoad(this.minaQuery || {}); }, mounted() { if(this.onShow) this.onShow(); }, beforeDestroy() { if(this.onUnload) this.onUnload(); unregisterPage(this.minaId); }, methods: { $minaSetData: setData, $minaEvent: event, $minaStyle: style, $minaHover: hover, onLoad(query) {
    const nb = calcNavBack()
    this.$minaSetData({ headerPaddingTop: calcHeaderPaddingTop(), navBackTop: nb.top, navBackSize: nb.size })

    const orderId = query && query.orderId ? String(query.orderId) : ''

    let payload = null
    try {
      const app = getApp()
      if (app && app.takeAgentHandoff) {
        const handoff = app.takeAgentHandoff(this.getPageId())
        payload = handoff && handoff.payload
        if (handoff) console.log('[checkout] handoff', handoff)
      }
    } catch (e) {}

    let order = loadOrder(orderId)
    if (payload && payload.orderId) {
      order = Object.assign({}, order || {}, payload)
      saveOrder(order)
    }

    if (!order || !order.orderId) {
      wx.showToast({ title: '订单不存在', icon: 'none' })
      return
    }

    normalizeOrder(order)

    const address = order.address || this._readStoredAddress()
    if (address && !order.address) {
      order.address = address
      order.status = 'confirmed'
      saveOrder(order)
    }

    this.$minaSetData({
      order,
      displayItems: buildDisplayItems(order),
      address: address || null,
      paid: order.status === 'paid'
    })
  },
onTapBack() {
    const pages = getCurrentPages()
    if (pages && pages.length > 1) {
      wx.navigateBack({ delta: 1 })
    } else {
      wx.reLaunch({ url: '/packageWeStoreCoffee/pages/home/home' })
    }
  },
_readStoredAddress() {
    try {
      return wx.getStorageSync(`address_${getOpenid()}`) || null
    } catch (e) {
      return null
    }
  },
"onTapChooseAddress"() { wx.showToast({title:"地址未接入"}); },
"onTapPay"() { wx.showToast({title:"支付未接入"}); },
onTapBackHome() {
    wx.reLaunch({ url: '/packageWeStoreCoffee/pages/home/home' })
  } } };</script>
<style scoped>.minabridge-page {
  background-color: #FFF8F0;
  height: 100%;
  overflow-x: hidden;
}

.ck-page, [data-mina-placeholder~="ck-page"]::placeholder {
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

.ck-header, [data-mina-placeholder~="ck-header"]::placeholder {
  padding: 4.266666666666667vw;
  background: #FFFFFF;
  border-bottom: 0.26666666666666666vw solid #EDE3D4;
  flex-shrink: 0;
}

.ck-title, [data-mina-placeholder~="ck-title"]::placeholder {
  font-size: 5.066666666666666vw;
  font-weight: 800;
  color: #2A1810;
}

.ck-sub, [data-mina-placeholder~="ck-sub"]::placeholder {
  font-size: 2.933333333333333vw;
  color: #A89180;
  margin-top: 1.0666666666666667vw;
}

.ck-body, [data-mina-placeholder~="ck-body"]::placeholder {
  flex: 1;
  padding: 3.2vw 4.266666666666667vw 0;
  box-sizing: border-box;
}

.ck-card, [data-mina-placeholder~="ck-card"]::placeholder {
  background: #FFFFFF;
  border-radius: 2.6666666666666665vw;
  padding: 3.7333333333333334vw;
  margin-bottom: 3.2vw;
  border: 0.26666666666666666vw solid #EDE3D4;
}

.ck-card-title, [data-mina-placeholder~="ck-card-title"]::placeholder {
  font-size: 3.466666666666667vw;
  font-weight: 700;
  color: #6B5544;
  margin-bottom: 2.6666666666666665vw;
}

.ck-addr-line, [data-mina-placeholder~="ck-addr-line"]::placeholder {
  display: flex;
  align-items: baseline;
}

.ck-addr-name, [data-mina-placeholder~="ck-addr-name"]::placeholder {
  font-size: 4vw;
  font-weight: 700;
  color: #2A1810;
}

.ck-addr-phone, [data-mina-placeholder~="ck-addr-phone"]::placeholder {
  font-size: 3.466666666666667vw;
  color: #6B5544;
  margin-left: 2.6666666666666665vw;
}

.ck-addr-detail, [data-mina-placeholder~="ck-addr-detail"]::placeholder {
  font-size: 3.466666666666667vw;
  color: #6B5544;
  margin-top: 1.3333333333333333vw;
  line-height: 1.5;
}

.ck-addr-empty, [data-mina-placeholder~="ck-addr-empty"]::placeholder {
  padding: 2.6666666666666665vw 0;
}

.ck-addr-empty-text, [data-mina-placeholder~="ck-addr-empty-text"]::placeholder {
  font-size: 3.7333333333333334vw;
  color: #8B5E3C;
  font-weight: 600;
}

.row-hover, [data-mina-placeholder~="row-hover"]::placeholder { opacity: 0.7; }

.ck-goods, [data-mina-placeholder~="ck-goods"]::placeholder {
  display: flex;
  align-items: center;
}

.ck-goods + .ck-goods {
  margin-top: 3.2vw;
  padding-top: 3.2vw;
  border-top: 0.26666666666666666vw solid #F2EADF;
}

.ck-thumb, [data-mina-placeholder~="ck-thumb"]::placeholder {
  width: 16vw;
  height: 16vw;
  border-radius: 2.1333333333333333vw;
  background-color: #F5EFE6;
  flex-shrink: 0;
}

.ck-goods-info, [data-mina-placeholder~="ck-goods-info"]::placeholder {
  flex: 1;
  margin-left: 2.6666666666666665vw;
  min-width: 0;
}

.ck-goods-name, [data-mina-placeholder~="ck-goods-name"]::placeholder {
  display: flex;
  align-items: baseline;
  font-size: 4vw;
  font-weight: 700;
  color: #2A1810;
}

.ck-goods-qty, [data-mina-placeholder~="ck-goods-qty"]::placeholder {
  margin-left: 1.6vw;
  font-size: 3.2vw;
  font-weight: 700;
  color: #8B5E3C;
  flex-shrink: 0;
}

.ck-goods-spec, [data-mina-placeholder~="ck-goods-spec"]::placeholder {
  font-size: 3.2vw;
  color: #6B5544;
  margin-top: 1.0666666666666667vw;
}

.ck-goods-price, [data-mina-placeholder~="ck-goods-price"]::placeholder {
  font-size: 4.266666666666667vw;
  font-weight: 800;
  color: #5C3A21;
  margin-left: 2.1333333333333333vw;
}

.ck-fee, [data-mina-placeholder~="ck-fee"]::placeholder {
  margin-top: 3.2vw;
  border-top: 0.26666666666666666vw dashed #EDE3D4;
  padding-top: 2.6666666666666665vw;
}

.ck-fee-row, [data-mina-placeholder~="ck-fee-row"]::placeholder {
  display: flex;
  justify-content: space-between;
  font-size: 3.466666666666667vw;
  color: #6B5544;
  margin-bottom: 1.6vw;
}

.ck-fee-total, [data-mina-placeholder~="ck-fee-total"]::placeholder {
  margin-top: 0.5333333333333333vw;
  margin-bottom: 0;
  font-weight: 700;
  color: #2A1810;
}

.ck-fee-total-num, [data-mina-placeholder~="ck-fee-total-num"]::placeholder {
  font-size: 4.266666666666667vw;
  font-weight: 800;
  color: #5C3A21;
}

.ck-paid-tip, [data-mina-placeholder~="ck-paid-tip"]::placeholder {
  text-align: center;
  font-size: 3.466666666666667vw;
  color: #8B5E3C;
  margin: 1.0666666666666667vw 0 2.1333333333333333vw;
}

.ck-bottom-spacer, [data-mina-placeholder~="ck-bottom-spacer"]::placeholder {
  height: 5.333333333333333vw;
}

.ck-footer, [data-mina-placeholder~="ck-footer"]::placeholder {
  background: #FFFFFF;
  border-top: 0.26666666666666666vw solid #EDE3D4;
  padding: 2.6666666666666665vw 4.266666666666667vw;
  flex-shrink: 0;
}

.safe-area-bottom, [data-mina-placeholder~="safe-area-bottom"]::placeholder {
  padding-bottom: calc(env(safe-area-inset-bottom) + 2.6666666666666665vw);
}

.ck-pay-line, [data-mina-placeholder~="ck-pay-line"]::placeholder {
  display: flex;
  align-items: center;
  gap: 2.6666666666666665vw;
}

.ck-pay-amount, [data-mina-placeholder~="ck-pay-amount"]::placeholder {
  flex: 1;
  display: flex;
  align-items: baseline;
}

.ck-pay-label, [data-mina-placeholder~="ck-pay-label"]::placeholder {
  font-size: 3.2vw;
  color: #6B5544;
  margin-right: 1.0666666666666667vw;
}

.ck-pay-num, [data-mina-placeholder~="ck-pay-num"]::placeholder {
  font-size: 5.866666666666666vw;
  font-weight: 800;
  color: #5C3A21;
}

.ck-pay-btn, [data-mina-placeholder~="ck-pay-btn"]::placeholder {
  padding: 3.2vw 7.466666666666667vw;
  border-radius: 133.2vw;
  background: linear-gradient(135deg, #8B5E3C 0%, #5C3A21 100%);
  flex-shrink: 0;
}

.ck-pay-done, [data-mina-placeholder~="ck-pay-done"]::placeholder {
  text-align: center;
}

.ck-pay-btn-disabled, [data-mina-placeholder~="ck-pay-btn-disabled"]::placeholder {
  opacity: 0.5;
}

.btn-hover, [data-mina-placeholder~="btn-hover"]::placeholder { opacity: 0.85; }

.ck-pay-btn-text, [data-mina-placeholder~="ck-pay-btn-text"]::placeholder {
  color: #FFFFFF;
  font-size: 4vw;
  font-weight: 700;
  letter-spacing: 0.26666666666666666vw;
}

@media (prefers-color-scheme: dark) {
  .minabridge-page { background-color: #121212; }
  .ck-page, [data-mina-placeholder~="ck-page"]::placeholder { background: linear-gradient(180deg, #121212 0%, #1A1510 100%); }
  .ck-header, [data-mina-placeholder~="ck-header"]::placeholder { background: #1E1E1E; border-bottom-color: #3E3228; }
  .ck-title, [data-mina-placeholder~="ck-title"]::placeholder { color: #E8E0D8; }
  .ck-sub, [data-mina-placeholder~="ck-sub"]::placeholder { color: #7A6E62; }
  .ck-card, [data-mina-placeholder~="ck-card"]::placeholder { background: #1E1E1E; border-color: #3E3228; }
  .ck-card-title, [data-mina-placeholder~="ck-card-title"]::placeholder { color: #9E8E7E; }
  .ck-addr-name, [data-mina-placeholder~="ck-addr-name"]::placeholder { color: #E8E0D8; }
  .ck-addr-phone, .ck-addr-detail, [data-mina-placeholder~="ck-addr-phone"]::placeholder, [data-mina-placeholder~="ck-addr-detail"]::placeholder { color: #9E8E7E; }
  .ck-addr-empty-text, [data-mina-placeholder~="ck-addr-empty-text"]::placeholder { color: #D4A574; }
  .ck-thumb, [data-mina-placeholder~="ck-thumb"]::placeholder { background-color: #2A2A2A; }
  .ck-goods + .ck-goods { border-top-color: #3E3228; }
  .ck-goods-name, [data-mina-placeholder~="ck-goods-name"]::placeholder { color: #E8E0D8; }
  .ck-goods-qty, [data-mina-placeholder~="ck-goods-qty"]::placeholder { color: #D4A574; }
  .ck-goods-spec, [data-mina-placeholder~="ck-goods-spec"]::placeholder { color: #9E8E7E; }
  .ck-goods-price, .ck-fee-total-num, .ck-pay-num, [data-mina-placeholder~="ck-goods-price"]::placeholder, [data-mina-placeholder~="ck-fee-total-num"]::placeholder, [data-mina-placeholder~="ck-pay-num"]::placeholder { color: #D4A574; }
  .ck-fee, [data-mina-placeholder~="ck-fee"]::placeholder { border-top-color: #3E3228; }
  .ck-fee-row, [data-mina-placeholder~="ck-fee-row"]::placeholder { color: #9E8E7E; }
  .ck-fee-total, [data-mina-placeholder~="ck-fee-total"]::placeholder { color: #E8E0D8; }
  .ck-paid-tip, [data-mina-placeholder~="ck-paid-tip"]::placeholder { color: #D4A574; }
  .ck-footer, [data-mina-placeholder~="ck-footer"]::placeholder { background: #1E1E1E; border-top-color: #3E3228; }
  .ck-pay-label, [data-mina-placeholder~="ck-pay-label"]::placeholder { color: #9E8E7E; }
  .ck-pay-btn, [data-mina-placeholder~="ck-pay-btn"]::placeholder { background: linear-gradient(135deg, #A07050 0%, #7A5030 100%); }
}
</style>

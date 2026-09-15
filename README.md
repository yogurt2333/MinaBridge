# MinaBridge

面向原生微信小程序的 AI 辅助迁移 CLI，首个输出目标是 Vue 2 H5。

仓库：https://github.com/yogurt2333/MinaBridge

开发规格：[v0.1 规格 Issue #1](https://github.com/yogurt2333/MinaBridge/issues/1)；[本地规格](docs/specs/minabridge-v0.1.md)。测试边界为真实 CLI、生成工程构建和浏览器操作。

## 当前阶段

已完成原端最小样本验证；CLI 已支持静态页面、列表交互和合成样本跨页迁移，咖啡三页的 22/44 元流程已通过真实浏览器测试。

- 输入样本：[WeStoreCafe](samples/westore-cafe/README.md)，来自微信官方示例，保留上游 MIT 许可证和版本记录。
- 已验证链路：饮品分类 → 选择规格 → 加入本地订单 → 结算。
- 验收数据：抹茶脑袋 17 元，大杯加 3 元、珍珠加 2 元，单件 22 元、两件 44 元。
- [原端验证报告](artifacts/baseline/report.md)记录截图、数据及已知问题。

## 首版目标

实现本地 CLI，输入小程序工程目录，输出可运行的 Vue 2 H5 工程与迁移报告。

当前静态样本可执行：

```sh
npm ci
npm run build
node dist/cli.js migrate ./samples/static-menu --out ./output/static-h5
cd output/static-h5
npm install
npm run build
npm run dev
```

运行要求：Node.js 24+；生成端固定 Vue 2.7.16、Vite 7.3.6、Vue 2 插件 2.3.4。Windows 路径包含空格或中文时用引号包围。目标目录必须为空且不能与输入目录重叠；重新演示使用新目录。

目前支持空 App 注册、Page 对象初始数据和方法，以及插值、条件、循环别名和 key、tap/input 事件、保留数字及对象类型的 dataset、嵌套 setData 更新。支持 view/text/image/input/button/scroll-view/block、WXSS、内联 rpx 和静态本地图片。带 key 的 block 循环明确报错，请使用实际 view 元素；已支持 onLoad/onShow/onHide/onUnload、navigateTo/navigateBack/reLaunch 和静态相对路径 CommonJS 模块。自定义组件、分包、tabBar、CSS import/url 尚不支持。迁移时只解析源脚本，生成页面方法在浏览器执行。自动 verify 尚未实现，生成报告明确标记 `not-run`。

后续任务见 [开发任务](https://github.com/yogurt2333/MinaBridge/issues?q=is%3Aissue+is%3Aopen)。模型已确定为本地 Ollama 的 qwen3.5:9b，目前仅确认已安装，尚未接入。

## 验证

跨页适配保留页面栈中的实例：返回不会重新执行 onLoad，重新进入会创建新实例。当前支持程序调用导航；浏览器原生前进/后退历史同步尚未实现。

同步存储通过 localStorage 保存 JSON：缺失键返回空字符串；undefined 和循环引用写入失败，旧值保留。支持 JSON 数据类型，Date 等对象遵循 JSON 序列化语义，不承诺保留原型。命名空间由规范化源工程绝对路径的 SHA-256 得出：同一浏览器来源下，同路径生成的工程共享数据，不同源路径隔离；更换浏览器来源或移动源目录不会共享。此隔离用于避免数据碰撞，不是同源恶意脚本之间的安全边界。

本地依赖仅支持字面量相对路径 .js 文件（可省略扩展名），转换时不执行模块；循环依赖明确拒绝。提示适配为浏览器状态浮层，布局信息采用浏览器视口；状态栏、系统胶囊和安全区域暂按零处理，不模拟微信系统 UI。

```sh
npx playwright install chromium --only-shell
npm run typecheck
npm test
```

测试通过真实 CLI 生成工程，再由 Vite 构建、无头浏览器校验文本、样式和本地图片。沙箱环境若限制构建子进程或浏览器，需要在允许本地执行的环境中运行。测试产物保存在被 Git 忽略的 `.test-output`。

退出码：0 表示请求阶段完成，1 表示不支持的转换/源语法问题，2 表示输入及路径配置错误，3 表示意外执行环境错误。标准错误输出诊断；生成成功不等于完整迁移验收通过。

依赖审计已修复 CSS 解析器可升级项；Vue 2 及其插件仍有 Vue 2 上游低危 ReDoS 报告且无可用 Vue 2 修复版。当前按明确的 Vue 2 目标保留，不适合把任意不可信模板作为公开服务输入。

首轮只验证样本的三个页面，不将样本成功等同于任意小程序迁移成功。地址授权、真实支付与原样本问题见验证报告。

## 目录

- `samples/`：迁移输入样本及来源说明。
- `artifacts/baseline/`：原端验证证据。

这是独立开发项目；开源样本用于可复现实验，不代表个人商业项目经历或已取得业务收益。



咖啡目标端证据见 [H5 验收报告](artifacts/coffee-h5/report.md)，包含规格页和结算页截图。复现：运行 npm test；仅运行咖啡验收可在 npm run build 后执行 node --test --test-name-pattern='coffee migration' tests/cli.test.mjs。


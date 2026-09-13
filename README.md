# MinaBridge

面向原生微信小程序的 AI 辅助迁移 CLI，首个输出目标是 Vue 2 H5。

仓库：https://github.com/yogurt2333/MinaBridge

开发规格：[v0.1 规格 Issue #1](https://github.com/yogurt2333/MinaBridge/issues/1)；[本地规格](docs/specs/minabridge-v0.1.md)。测试边界已确认，具体实现尚未开始。

## 当前阶段

已完成原端最小样本验证；首个 CLI 切片支持静态页面迁移，动态咖啡页面仍待后续任务实现。

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

目前支持空 App/Page 注册下的静态 view/text/image、静态属性、WXSS、rpx 和本地图片。动态绑定、方法、事件、自定义组件、分包、tabBar、CSS import/url 会明确报错。不会执行源工程脚本。自动 verify 尚未实现，生成报告明确标记 `not-run`。

后续任务见 [开发任务](https://github.com/yogurt2333/MinaBridge/issues?q=is%3Aissue+is%3Aopen)。模型已确定为本地 Ollama 的 qwen3.5:9b，目前仅确认已安装，尚未接入。

## 验证

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

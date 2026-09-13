# MinaBridge

面向原生微信小程序的 AI 辅助迁移 CLI，首个输出目标是 Vue 2 H5。

仓库：https://github.com/yogurt2333/MinaBridge

开发规格：[v0.1 规格 Issue #1](https://github.com/yogurt2333/MinaBridge/issues/1)；[本地规格](docs/specs/minabridge-v0.1.md)。测试边界已确认，具体实现尚未开始。

## 当前阶段

已完成原端最小样本验证，CLI 尚未实现。

- 输入样本：[WeStoreCafe](samples/westore-cafe/README.md)，来自微信官方示例，保留上游 MIT 许可证和版本记录。
- 已验证链路：饮品分类 → 选择规格 → 加入本地订单 → 结算。
- 验收数据：抹茶脑袋 17 元，大杯加 3 元、珍珠加 2 元，单件 22 元、两件 44 元。
- [原端验证报告](artifacts/baseline/report.md)记录截图、数据及已知问题。

## 首版目标

实现本地 CLI，输入小程序工程目录，输出可运行的 Vue 2 H5 工程与迁移报告。

以下为命令设计草案，目前不可执行：

```sh
mina-bridge migrate ./samples/westore-cafe --out ./output/cafe-h5
```

计划先贯通工程读取、页面转换及目标工程构建，再接入行为验证与有次数上限的自动修复。具体规格、模型接口及支持边界待开发设计阶段确定。

首轮只验证样本的三个页面，不将样本成功等同于任意小程序迁移成功。地址授权、真实支付与原样本问题见验证报告。

## 目录

- `samples/`：迁移输入样本及来源说明。
- `artifacts/baseline/`：原端验证证据。

这是独立开发项目；开源样本用于可复现实验，不代表个人商业项目经历或已取得业务收益。

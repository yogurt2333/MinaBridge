# 本地模型接入实验

2026-09-15，Ollama qwen3.5:9b，静态菜单样本。模型 digest：6488c96fa5faab64bb65cbd30d4289e20e6130ef535a93ef9a49f42eda893ea7。

实际执行 `node dist/cli.js migrate samples/static-menu --out output/ollama-static-20260915 --model qwen3.5:9b`。

接口返回并应用了一次合法页面改写：75232 ms，输入 810 tokens，输出 491 tokens；用量来自服务。费用未知。源摘要及输出摘要见 JSON 报告。此调用发生在本轮审查修复之前，后续修复涉及无效配置、无效响应与用量过滤，未重新调用模型。

`npx vite build output/ollama-static-20260915` 通过，但不能视为迁移成功：模型把规则转换器已经转为 vw 的部分 CSS 改回 rpx。独立浏览器检查在 375px 视口下测得菜单 paddingTop 为 0px，正确值应为 20px。失败证据见 browser-check.json、browser.png 和 generated-page.vue。

model-report 的 passed 仅表示接口与补丁应用成功。行为/样式验收失败；没有自动修复，没有将这次实验冒充完整咖啡模型迁移成功。该结果直接说明下一阶段需要真实浏览器验证与有限修复。

## 审查

Standards 无硬性规范违规，建议以后将模型调用与补丁应用拆分为可复用边界；已区分输出文件写入错误。Spec 发现 null 响应误分环境错误、非法地址未分配置错误、负 token 数被记录；均已修复并回归。全量 15 项测试及类型检查通过。

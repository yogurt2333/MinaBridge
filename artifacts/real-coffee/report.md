# v0.1 真实咖啡迁移验收

2026-09-16。结果：真实模型首次生成后构建、业务验收通过，0 轮修复。不是模型替身，不宣称通用迁移成功率。

## 配置与复现

Windows、Node 24.18.0、Ollama 本地 HTTP 服务、qwen3.5:9b Q4_K_M。模型 digest 为 `6488c96fa5faab64bb65cbd30d4289e20e6130ef535a93ef9a49f42eda893ea7`。temperature 0、think false、num_ctx 32768、num_predict 8192；每页输入上限 48000 字节。此次请求超时显式设为 600000 ms；无密钥及远程服务。

```powershell
npm ci
npx playwright install chromium --only-shell
npm run build
$env:MINABRIDGE_MODEL_TIMEOUT_MS='600000'
node dist/cli.js migrate samples/westore-cafe --out output/coffee-model-new --model qwen3.5:9b --verify
```

输出必须使用新空目录。初始调用基于 d1dc88f；运行期间的最终审查加强了工具内置咖啡断言，未修改源工程或模型产物，随后对同一产物再次运行完整验证。recheck.json 记录复核结果。CommonJS 边界修复不改变此样本（只使用顶层 require）。

## 实际指标

| 项目 | 结果 |
| --- | --- |
| 模型调用 | 3 次，三个页面各一次 |
| 输入 tokens | 39752，服务返回计数合计 |
| 输出 tokens | 20861，服务返回计数合计 |
| 首次运行总耗时 | 587904 ms，约 9 分 48 秒 |
| 修复轮数 | 0，上限 2 |
| 首次构建/行为 | passed / passed |
| 费用 | 未计算，不编造 |

逐页耗时、前后摘要见 model-report.json；首次与最终为同一轮，rounds/0 保留页面和验证日志。原始源摘要见 migration-report.json。JSON 截图路径相对本证据目录，亦保留同名 sku.png 与 checkout.png 便于查看。

## 行为及视觉

浏览器真实点击验证 35 款饮品，奶茶→抹茶脑袋→大杯+珍珠=22 元；第一次结算 1 件，返回再次加入为相同订单 2 件44元，商品和规格不变。地址/支付点击只提示未接入，没有支付成功状态。原端返回后活动件数提示不刷新仍是已知限制。

已人工查看规格页和结算页截图：商品、规格、价格清晰，关键按钮可操作，页脚布局正常。JSON 保持 pending-review 表示自动化没有视觉评分；本段是人工图像复核结论。源图片地址为空，保留空图片/失败图标；未复现微信状态栏、胶囊和 Skyline，不能声称像素一致。

## 独立构建与审查

在输出目录执行 npm install --ignore-scripts，再执行 npm run build，成功安装24个包并完成 Vite 构建（15模块）。独立锁文件已保存，可在此证据目录执行 npm ci --ignore-scripts 和 npm run build。仍有 Vue 2 相关2项低危审计结果，未改换目标框架。

全量23项测试通过、类型检查通过。Standards 发现条件/延迟 require 被提前执行，现明确拒绝非顶层变量初始化的 require，补CLI回归；AST遍历重复保留为非阻塞改进。Spec发现最终订单规格和支付行为验收缺口，现已补强，固定模型破坏规格/支付的测试会失败。

旧静态模型实验曾产生 rpx 回退；该失败保留在 artifacts/model-static，不能用本次成功覆盖它。有限修复机制由固定响应的失败→成功用例证明，本次真实运行未触发修复。

## 交付范围

完成本规格限定的本地 CLI、三页样本、模型接口、自动验证和有限修复；未公开发布 npm、未部署线上、未接入支付/地址/真实后端、未承诺任意小程序兼容。生成代码会执行，不是恶意输入沙箱。输入样本来源与 MIT 许可证见 LICENSE 和 samples/westore-cafe/README.md。

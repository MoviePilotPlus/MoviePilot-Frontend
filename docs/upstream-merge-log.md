# Upstream 合并记录（v3 → v3_plus）

> 本文档记录每次从 `upstream`（jxxghp/MoviePilot-Frontend）的 `v3` 分支合并到本仓
> `v3_plus` 分支的过程。**文件名固定，每次合并后在文末追加新条目**，不删除旧记录。
>
> 每条记录包含：合并范围（SHA 与提交数）、上游改动内容与用途、冲突清单与解决方法、
> 生成文件处理、验证结果、踩坑记录。配套规范见 monorepo 根目录 `AGENTS.md` 第 8 节、
> 操作手册 `SKILL.md` SKILL-12。

---

## 2026-08-24 合并（第 1 次记录）

### 范围

| 项 | 值 |
|---|---|
| merge-base | `17d4dbed` |
| 上游区间 | `17d4dbed..30b5c644`，共 **11 个提交** |
| 改动规模 | 65 文件，+4849 / −390 行 |
| 合并提交 | `3af2bbec`（Merge branch 'v3' into v3_plus） |
| 后续修复提交 | `9cb0305b`（SiteSchemaCard 死导入清理，见「验证」节） |

### 上游提交清单

```
30b5c644 feat(settings): expose required Rust acceleration (#707)
b8214c7f fix(workflow): 收口侧栏拖放生命周期 (#706)
c8b10479 fix: 隔离工作流编辑草稿并保留动作契约 (#705)
058b8f22 test: 统一前端测试夹具与发布工具链 (#704)
5847f9e9 test(workflow): cover workflow form contracts (#703)
72dc35ff fix(workflow): recover list refresh failures (#702)
f2ecc6af fix: prevent background timer registration after stop (#701)
cec2169c fix: preserve background timer lifecycle on replacement (#700)
abdf1bf2 fix: preserve pending KeepAlive refresh context (#699)
ca2f8138 test(vuetify): cover responsive input adapters (#698)
5277f148 fix(dashboard): reconcile plugin dashboard lifecycle (#697)
```

### 上游改动内容与用途

| 类别 | 涉及文件 | 用途 |
|---|---|---|
| 后台刷新生命周期修复 | `src/composables/useBackground.ts`、`useKeepAliveRefresh.ts`、`src/utils/backgroundManager.ts` 及其 `__tests__`（#699~#701） | 防止 stop 之后仍注册后台定时器、组件替换时保留定时器生命周期、KeepAlive 待处理刷新上下文不丢失 |
| Workflow 稳定性 | `WorkflowAddEditDialog.vue`、`WorkflowTaskCard.spec.ts` 等（#702/#703/#705/#706） | 列表刷新失败恢复、表单契约测试、编辑草稿隔离、侧栏拖放生命周期收口 |
| 测试夹具与发布工具链统一 | `tests/setup.ts`、`tests/support/msw/**`（6 个 handler）、`tests/config/*.spec.ts`、约 25 个组件级 `__tests__`、`docs/testing.md`、`docs/code-quality.md`、`.prettierignore`、`.github/workflows/build.yml`（#704） | 统一 msw mock 夹具与测试支撑层；新增 workflow/format 工具链契约测试 |
| 设置页功能 | `src/views/setting`、`src/locales/*`（#707） | 暴露必需的 Rust 加速设置项 |
| 其他 | `src/plugins/vuetify/__tests__/AppInput.spec.ts`（#698）、dashboard 插件生命周期（#697）、`vite.config.ts` | vuetify 响应式输入适配器测试覆盖；仪表盘卡片生命周期对账 |

fork 的采集域视图（`src/views/collect/` 等）均为独有文件，本次上游未触及，零冲突。

### 冲突清单与解决方法

| 文件 | 冲突原因 | 解决方法 |
|---|---|---|
| `eslint-suppressions.json` | 双方都改了豁免表：本方新增采集卡片豁免条目（CollectCard/EpisodeCard/SiteSchemaCard 等），上游删除了 `src/pages/dashboard.vue` 的 `no-explicit-any` 豁免（在源头修掉了问题） | 取**并集**：以本方版本为基，手工删去 dashboard.vue 条目块。原则：上游删豁免 = 上游已修代码，必须跟随；本方新增条目保留 |
| `package.json` | 无实际冲突（自动合并）：上游改 `packageManager: yarn@1.22.22`，本方加 `hls.js` 依赖，不同 hunk | 自动合并通过，核对无误 |

### 生成文件处理

- `yarn.lock`：上游无改动，无需重算；`yarn install` 重装依赖（90s，postinstall 图标构建正常）。

### 验证结果

- **ESLint** ✅：首次运行在 `src/components/cards/SiteSchemaCard.vue` 报 4 个
  `no-unused-vars`——排查确认是本方昨天 `e1df64c5`（图标修复）遗留的死导入，
  **非合并引入**；直接删除死导入并在豁免表中将该文件的 `no-unused-vars` 计数块移除，
  以 `9cb0305b` 单独提交。
- **单元测试** ⚠️：1399/1405 通过。失败的 6~7 个用例（两次运行间有 1 例波动）
  全部集中在 3 个**上游本次新增**的 spec，且均为 Windows 环境性失败，非回归：
  1. `tests/config/frontend-workflow.spec.ts`（2 例）：断言 `.github/workflows/*.yml`
     内容含 LF 字符串，本机 autocrlf 检出为 CRLF 导致必炸；
  2. `tests/config/format-changed.spec.ts`（4 例）：需要符号链接特权（EPERM）、
     测试文件名含换行符（Windows 不支持）、Unix git mock 路径；
  3. `src/views/reorganize/__tests__/TransferHistoryView.spec.ts`（1 例）：同 CRLF 问题。
  这些用例在上游 Ubuntu CI 可通过。**决定：不为平台差异修改上游测试**
  （避免制造未来合并冲突），记录为已知 Windows 局限。
- **TypeCheck** ✅：`vue-tsc --noEmit` 通过（exit 0）。

### 踩坑记录（固化到根 SKILL.md 坑速查）

1. **autocrlf 机器跑上游「文件内容断言」类测试必炸**：凡 spec 里 `readFileSync`
   后 `toContain('xx\nyy')` 的契约测试，在 Windows autocrlf=true 检出下全部失配。
   判别特征：AssertionError 的 Received 里满是 `\r\n`。这不是代码问题，别去改业务代码。
2. **eslint-suppressions.json 是「双方高频共改」文件**：上游修一个 lint 问题就会删一条
   豁免，本方加采集页面就会加一条——几乎每次合并都会撞。解法固定为并集：
   上游删的跟着删（他们已在源头修复），本方加的保留。
3. **并行跑 lint 与 vitest 会造成 vitest worker 超时假失败**（`Timeout calling
   "onTaskUpdate"`）：验证闸门串行跑。
4. **合并前先查「潜在冲突面」**：`comm -12 <(上游改文件) <(本方改文件)` 提前列出
   交集，本次交集仅 2 文件，实际冲突也仅这 2 文件，预估准确。

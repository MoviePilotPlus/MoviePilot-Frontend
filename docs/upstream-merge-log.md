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

## 2026-08-24 合并（第 2 次记录，定时任务执行）

### 范围

| 项 | 值 |
|---|---|
| merge-base | `30b5c644` |
| 上游区间 | `30b5c644..7c02bf7c`，共 **1 个提交** |
| 改动规模 | 5 文件，+541 / −16 行 |
| 合并提交 | `8e06cb4c`（Merge branch 'v3' into v3_plus） |

### 上游改动内容与用途

- `fix(workflow): align share response contracts (#708)`：工作流分享响应契约对齐——
  ForkWorkflowDialog 契约修正、WorkflowShareDialog/ForkWorkflowDialog/
  WorkflowShareCard 三个 spec 新增或补强、vite.config.ts 配套调整。

### 冲突清单与解决方法

无冲突（潜在冲突面预判为空，与实际一致）。

### 验证结果

- **ESLint** ✅
- **单元测试**：1403/1409 通过；6 个失败全部命中本文档第 1 条记录的
  「Windows 已知环境性失败」清单（frontend-workflow CRLF×2、format-changed
  symlink/换行文件名×4、TransferHistoryView CRLF×1），非回归。
- 依赖无变化，未触发重装。

### 备注

本次为定时任务首次自动执行。流程要点：先枚举潜在冲突面（为空）再合并，
验证只跑了 lint+单测（依赖未变）。

## 2026-08-25 合并（第 3 次记录，定时任务执行）

### 范围

| 项 | 值 |
|---|---|
| merge-base | `7c02bf7c` |
| 上游区间 | `7c02bf7c..c2b21f7e`，共 **6 个提交** |
| 改动规模 | 23 文件，+1638 / −39 行 |
| 合并提交 | 零冲突（潜在冲突面 src/api/types.ts 双方各加各的块，自动合并成功） |

### 上游改动内容与用途

- `feat(system): add release update prompt`：配合后端 staged release updates 的
  系统更新提示 UI（SystemUpdateStatus 类型 + 状态机展示）。
- `feat: 展示 V3t 运行时状态并锁定 Rust 加速 (#710)`：配合 Python 3.14t 自由线程镜像。
- workflow 测试补强（#711/#712）、共享列表请求恢复（#709）、
  discover 音乐榜默认专辑修复。

### 冲突清单与解决方法

无 git 冲突。fork 的采集类型块（types.ts 尾部 238 行追加块）与上游新增
SystemUpdate 类型（中部插入）不重叠，自动合并。

### 验证结果

- **ESLint** ✅
- **单元测试**：963 中 1 失败（TransferHistoryView CRLF 断言，已知 Windows 环境性失败）；
  另有 format-changed/frontend-workflow spec 的已知环境失败在 config 档（计入历史清单）。
- 依赖无变化。


## 2026-08-25 合并（第 4 次记录，定时任务执行）

### 范围

| 项 | 值 |
|---|---|
| merge-base | `62b2eae1` |
| 上游区间 | `62b2eae1..bb25732c`，共 **7 个提交** |
| 改动规模 | 27 文件，+1436 / −220 行 |
| 合并提交 | 零 git 冲突（eslint-suppressions/types.ts 双方各改各区自动合并） |

### 上游改动内容与用途

- 数据库备份管理界面完善（#717）+ 设置面板格式化（#719）；
- 下载任务破坏性删除确认（#718）；会话失效静默处理；
- 仪表盘自动网格尺寸稳定化（#720）；音乐优先级规则组、歌词设置与专辑整理；
- 新增 DatabaseBackupPanel/useConfirm/AnalyticsWeeklyOverview 等 spec。

### 验证结果

- ESLint ✅；单测 996 中 1 失败 = 已知 TransferHistoryView CRLF 断言（环境性）。
- 依赖无变化。


## 2026-08-26 合并（第 5 次记录，定时任务执行）

### 范围

- merge-base `bb25732cf` → upstream/v3 `06c711bb`，增量 **1 提交 / 17 文件**（+1561−101）。
- 上游 `feat(plugin): 增加插件来源绑定与换源界面 (#722)`：插件市场新增「来源绑定/换源」
  能力——新 API 层 `src/api/pluginSource.ts`（含 spec）、PluginCard/PluginAppCard/
  PluginMarketDetailDialog/PluginVersionHistoryDialog 组件与视图改动、三语言 locale。

### 冲突与解法

- **零冲突**（git 自动合并）。唯一潜在冲突面 `src/api/types.ts` 自动合并成功。
- 验收三件套：vitest 4 文件 87 例全绿；eslint 4 个改动入口文件 0 问题；
  `vue-tsc --noEmit` exit=0。fork 的 collect 视图/采集配置不在本次改动面，未触碰。

## 2026-08-26 合并（第 6 次记录，定时任务执行）

### 范围

- merge-base `06c711bb` → upstream/v3 `f9ad7bc2`，增量 **1 提交 / 5 文件**（+133）。
- 上游 `feat(settings): expose data retention controls`：系统设置页新增数据保留
  控件（AccountSettingSystem.vue +84 行含 spec）与三语言 locale。

### 冲突与解法

- **零冲突**（自动合并，无重叠文件）。
- 验收三件套：vitest 37 例全绿；eslint 0 问题；vue-tsc --noEmit exit=0。
- fork 采集视图/采集配置不在改动面，未触碰。

## 2026-08-26 合并（第 7 次记录，定时任务执行）

### 范围

- merge-base `f9ad7bc2` → upstream/v3 `4be29cc0`，增量 **1 提交 / 12 文件**（+259−59）。
- 上游 `fix(plugin): 完善市场安装状态与官方来源选择 (#723)`：插件市场安装状态展示
  与官方源选择完善（PluginCardListView +70 行、spec +92 行及关联组件/语言包）。

### 冲突与解法

- **零冲突**（fork 侧自基点无改动，无重叠文件）。
- 验收三件套：vitest 44 例全绿；eslint 0 问题；vue-tsc --noEmit exit=0。

## 2026-08-26 合并（第 8 次记录，定时任务执行）

### 范围

- merge-base `4be29cc0` → upstream/v3 `dc6c0462`，增量 **2 提交 / 22 文件**（+602−219）。
- 上游 `fix(plugin)` 明确插件仓库绑定与换仓确认（#724）、`fix(site)` 静默处理站点
  图标缺失（含 msw handler 与 vite 配套）。

### 冲突与解法

- **零冲突**（唯一潜在面 `src/api/types.ts` 自动合并成功，无标记残留）。
- 验收三件套：vitest 44 例全绿；eslint 0 问题；vue-tsc --noEmit exit=0。

## 2026-08-27 合并（第 9 次记录，定时任务执行）

### 范围

- merge-base `dc6c0462` → upstream/v3 `d8a843d5`，增量 **1 提交 / 13 文件**（+408−98）。
- 上游 `fix(plugin): 收敛插件仓库来源交互 (#725)`：插件卡混合排序
  （PluginMixedSortCard 新组件+spec）、仓库来源交互收敛。

### 冲突与解法

- 零冲突（types.ts 自动合并）。验收三件套：vitest 48 例全绿 / eslint 0 / tsc 0。

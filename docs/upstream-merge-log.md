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

## 2026-08-27 合并（第 10 次记录，定时任务执行）

### 范围

- merge-base `d8a843d5` → upstream/v3 `42db5ab5`，增量 **1 提交 / 4 文件**
  （fix(plugin): 更新过程保留绑定源 #726——PluginCard 与
  PluginMarketDetailDialog 更新时携带 bound source，配套 spec 断言）。

### 冲突与解法

- **零冲突**（4 文件均 fork 无增量区）。

### 验证

- `yarn install --immutable` ✅；`yarn lint`（eslint --max-warnings=0）✅；
- `yarn test:run`：2 文件 6 例失败，worktree 旧树同败 → Windows 环境族放行
  （frontend-workflow CRLF permissions 断言 ×2、format-changed symlink/缓冲区
  ×4，与第 9 次记录相同族；TransferHistoryView 2:3 cover 与 dashboard
  first-frame 两例旧树同败亦环境相关）；
- `yarn typecheck`（vue-tsc）✅。

## 2026-08-30 合并（第 23 次记录，定时任务执行）

- 前端增量 **2 提交 / 12 文件（+229−23）**：`ca48c146` site-resource 移动端
  虚拟滚动（ProgressiveCardGrid）、`1f2b3e90` 登录前等待初始化状态
  （initialize.vue + auth-guard/initialize/plugin-sidebar 新测试）。
  自动合并零冲突（共享面仅 src/router/index.ts，双方改动不相交）。
- 三件套：yarn install --immutable ✅、lint ✅ 0 警告、typecheck ✅；
  test:run 1423 过 6F=frontend-workflow×2（CRLF 断言）+ format-changed×4
  （symlink 特权/ENOENT）——均为 SKILL.md 已记录 Windows 必假失败族，放行。
  本轮新增/触及 5 个测试文件单跑 36 例全绿。
- 后端本轮无增量（22 轮已并入 `3e9c2dcf4`），跳过。

## 2026-08-31 合并（第 24 次记录，定时任务执行）

- 前端增量 **1 提交 / 12 文件（+204−38）**：`31ec7d3a` dashboard 图表在
  路由离开前 deactivate（防止后台实例泄漏，新增 DashboardRender.spec）。
  自动合并零冲突，合并提交 `7e7569cc` 双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ 0 警告、typecheck ✅；
  test:run 1425 过 6F=frontend-workflow×2（CRLF）+ format-changed×4
  （symlink/ENOENT/缓冲）+ TransferHistoryView×1——均为已知 Windows 必假
  失败族，与第 23 轮清单 IDENTICAL，放行。新增 2 个测试文件单跑 3 例全绿。
- 后端无增量（23 轮已接入 `3e9c2dcf4`），跳过。

## 2026-08-31 合并（第 25 次记录，定时任务执行）

- 前端增量 **3 提交 / 16 文件（+801−193）**：`57127dd2` v3 profile 与 auth
  错误对齐、`b512aee6` 历史删除恢复状态暴露、`dd90d407` 通知渠道稳定身份
  与保存交互完善。自动合并零冲突（共享面仅 src/api/types.ts，双方改动
  不相交），双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ 0 警告、typecheck ✅；
  test:run 1426 过 6F=frontend-workflow×2（CRLF）+ format-changed×4
  （symlink/ENOENT/缓冲）+ TransferHistoryView×1——与第 24 轮已知 Windows
  假失败族 IDENTICAL，放行。本轮触及 5 个 spec 单跑 72 例全绿
  （client/index/SendMessageAction/AccountSettingNotification/UserProfileView）。
- 后端 +15 另见后端仓记录。

## 2026-08-31 合并（第 26 次记录，定时任务执行）

- 前端增量 **9 提交 / 18 文件（+653−30044 大头为图标清理）**：`e7f29324`
  独立服务状态检测页面（service-status.vue + 测试）、`39e8d7ff` 壁纸轮换
  与静态图配置、`9c7310fa` 订阅批量删除保留失败项、玻璃背景模糊延迟/
  V3t 图标裁切/设置卡片色条/输入提示间距等 UI 修复、`28d2dba2` music
  测试进度清理 mock。自动合并零冲突（共享面 types.ts/router/common.scss
  双方不相交），双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ 0 警告、typecheck ✅；
  test:run 1437 过 6F=frontend-workflow×2（CRLF）+ format-changed×4
  （symlink/ENOENT/缓冲）+ TransferHistoryView×1——与第 24/25 轮已知
  Windows 假失败族 IDENTICAL，放行。新增 3 个测试文件（service-status/
  inputHintSpacing/settingCardAppearance）单跑 4 例全绿。
- 后端 +11 另见后端仓记录。

## 2026-09-01 合并（第 30 次记录，定时任务执行）

- 前端增量 **1 提交 / 2 文件（+54−7）**：`6274b3be` 历史批量操作限定于
  可见记录（防跨分页误删）。自动合并零冲突，双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 1437 过
  6F=已知 Windows 假失败族 IDENTICAL（frontend-workflow×2 CRLF +
  format-changed×4 + TransferHistoryView 2:3 poster 旧用例）；触及的
  TransferHistoryView.spec 26 例中 25 过（唯一败例即上述已知族）。
- 后端 +10 另见后端仓记录。

## 2026-09-01 合并（第 31 次记录，定时任务执行）

- 前端增量 **1 提交 / 8 文件（+17−21）**：`e9e63b29` 默认主题改为玻璃
  主题（theme.ts 默认值切换）。自动合并零冲突，双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 1437 过
  6F=已知 Windows 假失败族 IDENTICAL，放行。
- 后端 +11 另见后端仓记录。

## 2026-09-01 合并（第 32 次记录，定时任务执行）

- 前端增量 **2 提交 / 4 文件（+135−19）**：`d7a6e9d1` Agent 支持粘贴板
  图片、`1aaff8f8` 工作流持久化动作节点恢复。自动合并零冲突，双亲通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 1438 过
  6F=已知 Windows 假失败族 IDENTICAL，放行。
- 后端 +2 另见后端仓记录。

## 2026-09-02 合并（第 34 次记录，定时任务执行）

- 前端增量 **2 提交 / 12 文件（+608−178）**：`90193d5d` 区分应用更新与
  资源更新（useSystemUpdateStatus composable）、`b07d60ca` 默认头像
  不再写入用户资料。自动合并零冲突，双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 1439 过
  6F=已知 Windows 假失败族 IDENTICAL，放行。
- 后端 +9 另见后端仓记录。

## 2026-09-02 合并（第 36 次记录，定时任务执行）

- 前端增量 **1 提交 / 2 文件（+29−1）**：`00248805` 手动检查后刷新
  更新状态（ServiceView）。自动合并零冲突，双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 1439 过
  6F=已知 Windows 假失败族 IDENTICAL；触及的 ServiceView.spec 7 例全绿。
- 后端 +5 另见后端仓记录。

## 2026-09-03 合并（第 37 次记录，定时任务执行）

- 前端增量 **10 提交 / 28 文件（+997−131）**：`3a879744` 订阅治理前端
  （msw handlers）、`ae0a423d` 工作流编辑器连线恢复、`92464b75` 空通知
  渠道配置处理、`849a43be/880ac5c2` 历史状态筛选布局与移动端图标、
  `c5d4b9ee` PWA favicon 透明度、`f5f690ba` 资源更新即时轮询、
  `3f5768dc` 订阅完成后恢复卡片元数据、`29fd83ed/fecf8089` 目录卡片/
  玻璃控件样式。自动合并零冲突（共享面 test.yml/types.ts 不相交），
  双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 1459 过
  6F=已知 Windows 假失败族 IDENTICAL + 2 例新定性：
  - WorkflowActionsDialog data contract：单跑 21 例全绿=分片观察者效应
    （2104ms 慢用例）；
  - TransferHistoryView "status filter joins search"：spec 与组件与上游
    逐字节一致——失败根因是测试用 `indexOf('<VCombobox\n...')` 抽段，
    本仓 CRLF 使失配返回 -1、slice 到文件尾多算 IconBtn——**CRLF 假失败
    族新用例**（与 frontend-workflow 同根）。
- 后端 +29 另见后端仓记录。

## 2026-09-03 合并（第 38 次记录，定时任务执行）

- 前端增量 **3 提交 / 218 文件（+12088−31074）**：`e105e40a` 订阅执行
  状态轮询与展示优化、`b67c6ee4` 视觉规则编辑器（替换旧
  CategoryEditDialog——上游删 652 行，fork 侧 0 diff 安全跟随）、
  `6b8c0bf4` 设置工作区 UI 精修。
- 冲突 2 文件：
  - eslint-suppressions.json：程序化并集（git 取两侧原文件解析合并，
    fork 187 键全保留 + 上游新增并入；上游删的 DirectoryCard no-explicit-
    any 等豁免跟随删）；
  - types.ts：上游中段改动（订阅字段调整 + MediaClassification 快照
    类型）+ fork 尾部采集块（MARK 分隔）双侧叠加；fork MARK 前的
    CategoryRule/CategoryConfig 块单独回插（首轮漏——预检 grep 抓回）。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 1504 过
  6F=已知 Windows 假失败族 IDENTICAL + 4 例定性：WorkflowActionsDialog
  ×1 与 ServiceView×1 单跑全绿=观察者效应、TransferHistoryView×2=CRLF
  族（37 轮已定性同根）。
- 后端 +15 另见后端仓记录。

## 2026-09-03 合并（第 39 次记录，定时任务执行）

- 前端增量 **2 提交 / 14 文件（+395−196）**：`2b643cfd` 分类设置控件
  精修、`a5ffdb27` 分类标签去重（新增 mediaClassification.ts 工具）。
  自动合并零冲突，双亲验证通过。
- 三件套：install --immutable ✅ typecheck ✅；lint 两步修复：
  1. fork 侧 AccountSettingCollect.vue 的豁免是**数字简写形态**
     （`"no-explicit-any": 37`）——上游 38 轮 eslint 升级后只认
     `{count}` 对象形态，简写静默失效爆 37 错——程序化规范化；
  2. 修完后 prune-suppressions 清上游已删文件（CategoryEditDialog
     等）的 stale 豁免（-50 行；注意必须先修真实报错再 prune，
     否则 prune 会连带清掉 fork 仍有效的豁免）。
  test:run 1505 过 8F=已知 Windows 假失败族 IDENTICAL。
- 后端 +5 另见后端仓记录。

## 2026-09-04 合并（第 41 次记录，定时任务执行）

- 前端增量 **8 提交 / 232 文件（+3995−31389）**：`1f3f7598` 响应式
  应用壳层与滚动顶栏重构（useShellScrollState）、`5e385241` 分类配置
  与审阅 UI 精修、`455ed07a/0d7640c1/bab43700` 移动端底栏三连修、
  `565c7928` 目录设置打开分类规则、`e8ae7e5d` 更新提醒浮层材质。
  自动合并零冲突（共享面 setting.vue/i18n-menu 不相交），双亲通过。
- 三件套：install --immutable ✅ lint ✅（不带 --fix——坑 29）typecheck ✅；
  test:run 1575 过 9F=已知 Windows 假失败族 IDENTICAL。
- 后端 +8 另见后端仓记录。

## 2026-09-04 合并（第 42 次记录，定时任务执行）

- 前端增量 **3 提交 / 11 文件（+192−53）**：`199eee0a` 历史筛选组与
  错误消息精修、`c6fc6caf` 分类源回退去重边框、`a8915721` 底栏配件
  组居中（notification.ts 工具抽取）。自动合并零冲突，双亲通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 1574 过
  9F=已知 Windows 假失败族（8 旧例 + glassOverlayMaterial×1 新例定性：
  spec indexOf 含 `\n` 字面量 needle 在 CRLF 工作树失配返回 -1——
  TransferHistoryView 同根 CRLF 族；纯上游树同败佐证）。
- 后端本轮终止（用户本地未提交改动与上游增量同文件冲突，见报告）。

## 2026-09-05 合并（第 43 次记录，定时任务执行）

- 前端增量 **1 提交 / 4 文件（+40−5）**：`afeae0b4` 分类规则开关
  保留条件组。自动合并零冲突，双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 1575 过
  9F=已知 Windows 假失败族 IDENTICAL（含 glassOverlayMaterial CRLF 例）。
- 后端 +9 另见后端仓记录。

## 2026-09-05 合并（第 44 次记录，定时任务执行）

- 前端增量 **2 提交 / 26 文件（+398−453）**：`d64b0ad8` 分类策略编辑
  器控件精修、`79ab32b0` 订阅状态 tooltip 绑定完整状态。自动合并零
  冲突，双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 1574 过
  9F=已知 Windows 假失败族 IDENTICAL。
- 后端 +6 另见后端仓记录。

## 2026-09-05 合并（第 45 次记录，定时任务执行）

- 前端增量 **5 提交 / 12 文件（+1240−145）**：`653a912b` 转移手动
  审核任务暴露到队列（TransferManualReviewDialog 新组件 + 测试）、
  `6e6d03b5/2aacffb9` 手动审核对话框移动端优化与警告保持可见、
  `608e4ae2/e95505a0` 分类移动端预览与规则切换高度。自动合并零冲突，
  双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 1578 过
  7F=已知 Windows 假失败族 IDENTICAL。
- 后端 +11 另见后端仓记录。

## 2026-09-05 合并（第 46 次记录，定时任务执行）

- 前端增量 **5 提交 / 286 文件（+5924−31174）**：`775977a3` 结构化 API
  能力条目补全（TransferHistoryMaintenancePanel 新组件+测试）、
  `a10fd121/e359b965` 资源搜索空态与缓存结果安全恢复、`12b04733`
  订阅搜索进度澄清、`56a0bf68` 插件卡片高级操作分组。自动合并零冲突
  （共享面 types.ts/SubscribeListView 不相交），双亲验证通过。
- 三件套：install --immutable ✅ lint ✅（不带 --fix）typecheck ✅；
  test:run 1601 过 8F=已知 Windows 假失败族 IDENTICAL + dashboard
  cached profile×1 与 WorkflowActionsDialog×1 单跑全绿=观察者效应。
- 后端 +12 另见后端仓记录。

## 2026-09-05 合并（第 47 次记录，定时任务执行）

- 前端增量 **1 提交 / 5 文件（+54−16）**：`e6d11030` 修复整理历史筛选
  框与自动分类弹窗对齐。自动合并零冲突，双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 1602 过
  7F=已知 Windows 假失败族 IDENTICAL + 新例定性 3：
  - TransferHistoryView "native outlined alignment"——同 spec 文件
    CRLF 族新断言（indexOf 根因同族）；
  - eslint-config "允许图片别名" 70s 超时——单跑 48 例全绿=机器负载
    （当轮后端性能采样 82-127s 极端值同窗口佐证）；
  - WorkflowActionsDialog——单跑全绿=观察者效应。
- 后端 +11 另见后端仓记录。

## 2026-09-06 合并（第 48 次记录，定时任务执行）

- 前端增量 **1 提交 / 8 文件**：`bb6cdb2e` 完善音乐候选展示与手动下载
  确认（MusicMatchBadge 组件 + torrent.ts 工具抽取）。自动合并零冲突，
  双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 1605 过
  10F=已知 Windows 假失败族 IDENTICAL（TransferHistoryView×3 全为
  CRLF 族断言，47 轮已定性同根）。
- 后端 +4 另见后端仓记录。

## 2026-09-06 合并（第 50 次记录，定时任务执行）

- 前端增量 **3 提交 / 6 文件（+384−37）**：`3b55e787` 历史按专辑分组
  音乐轨道（TransferHistoryView 大改 +231 行测试）、`dc2dd8d3` 分类
  未分类标签去重、`9cefc93a` 上游自合并（含 #752 历史轮询上游修复）。
  自动合并零冲突（共享面 suppressions/types 不相交），双亲验证通过。
- 三件套：install --immutable ✅ lint ✅（不带 --fix）typecheck ✅；
  test:run 1605 过 10F=已知 Windows 假失败族 IDENTICAL
  （TransferHistoryView×3 为 CRLF 族断言）。
- 后端 +7 另见后端仓记录。

## 2026-09-06 合并（第 51 次记录，定时任务执行）

- 前端增量 **18 提交 / 205 文件（+3939−30535）**：**玻璃导航折射大轮**
  （e8484504→f466912c 共 14 提交：实时导航栏折射原型→参数驱动 POC→
  V3 表面材质统一→可读性光学→性能优化三连→#755 合入，新增
  glassNavbarRefraction.ts 工具+测试与 _glass-v3.scss 主题）、
  `33bb01ab` 历史字幕与音轨记录区分、`2e854804` 取消请求不弹 toast、
  `7f046dd0` 分类策略历史堆叠。自动合并零冲突（suppressions 自动
  并入），双亲验证通过。
- 三件套：install --immutable ✅ lint ✅（不带 --fix）typecheck ✅；
  test:run 1665 过 12F=已知 Windows 假失败族 IDENTICAL + 新例定性：
  useMediaSubscribe cancelled-create 单跑 43 例全绿=观察者效应。
- 后端 +8 另见后端仓记录。

## 2026-09-07 合并（第 54 次记录，定时任务执行）

- 前端增量 **8 提交 / 54 文件（+3635−358）**：玻璃面板系列 6 提交
  （#756 软轮廓+侧栏圆角折射+仪表盘悬停材质+去冗余采样+Inactive GPU
  延迟）、`1fb09274` 自动更新与 Dev 跟踪设置拆分（AccountSettingSystem
  增 MOVIEPILOT_UPDATE_DEV 开关+新测试）、`9acf9396` MediaVault 自建
  媒体库。自动合并零冲突，双亲验证通过。
- 三件套：install --immutable ✅ lint ✅（prune 收敛）typecheck ✅；
  test:run 2892 过 10F——AccountSettingSystem×5 为 **fork 真回归已修**：
  采集语言包 `locales/collect/*.ts` 残留旧版 `setting.system.moviePilot*`
  词条，经 i18n mergeLocaleMessage 深合并**遮蔽**上游 1fb09274 新文案
  （「自动检查版本更新」找不到 label）；纯上游树对照 43 绿复现差异后
  删 stale 词条×3（moviePilotAutoUpdate/Hint 双语言、dataCleanup*Hint、
  autoUpdateResourceHint 遮蔽族全清）→ 43/43 绿。其余 TransferHistory
  View×3+glassOverlayMaterial×1+format-changed×4+frontend-workflow×2
  纯上游树同败=已知 Windows 假失败族 IDENTICAL（symlink EPERM/CRLF）。
- 后端 +? 另见后端仓记录。

## 2026-09-07 合并（第 54 次记录·后端：MediaVault 模块 + uv.lock 采集依赖回补）

前端两段：36e18ee3（9 提交：MediaVault 自建媒体库 + auto-update/dev 拆分）、
496edbea（9 提交：glass 材质四连修 + 资源搜索级联收敛）；用户 WIP 四文件
与上游零交集，全程带 WIP 合并。后端增量 **10 提交 / 45 文件（+2157−188）**：
MediaVault 模块（PR #6596）、auto-update 与 dev tracking 拆分
（config.update_check_enabled）、frozen source step identity、
architecture 基线四刷新。

- 本轮特殊背景：第 53 轮后推送间隔内插入了两批用户会话提交
  （b80480473 腾讯 TV 线路 + f6a8234a6 em=80 fallback），第 54 轮
  preflight 时工作区有该会话未提交 WIP（音轨选择 + TENCENT_FETCH_LINE
  + 5MB 调优），中断轮已 stash 两次（stash@{0} 后期 overlay、
  stash@{1} 首轮含 5MB）。恢复现场后全部核验。
- 冲突 5 文件（两文档 + 两基线 + capability 测试）：全部生成/权威文件族，
  中断轮已解算——核验通过后仅补 checklist mypy 行（12,462→12,461），
  后随 tv_assets 吸收改 12,519/630。
- **腾讯会话两大门禁破口回修（合并前存量）**：
  a) mypy.ini 的 `[mypy-app.modules.tencent._tv_assets.*] ignore_errors`
  违反 fork 门禁（type_gate 断言 mypy.ini 无 ignore_errors）——删段，
  59 条错误按 tmdbv3api 先例进基线（含 Windows 少报的 anc_decrypt
  assignment 1 条剔除），mypy 12,461→**12,519 / 630 文件**；
  b) 6 个 TV 多词文件未登记 filename-policy（tv_login/tv_client/
  _tv_assets×4，SSD 站点同族）——按 youku _nativesign 先例登记。
- **uv.lock 采集依赖回补**：HEAD 锁自 2026-08-21 大迁移提交（4dd7cee0c
  pyproject 已加 construct/m3u8/unicorn/wasmtime 等 11 包）后丢失全部
  采集域条目（-S 全历史仅该提交出现），说明 53 轮 lock 均 take-theirs。
  本轮 merge 带回（+145 行，13 包），且此前 CI 装锁在 pyproject 已声明
  的状态下运行——修复+推送后 CI 变绿。
- **用户真实库连带事故排查**：冒烟报 duplicate column selected_audio_tracks
  ——用户 14:28 的 app.main（3001）用含 WIP 迁移文件的树升级了 config/
  user.db 到 b52786024c6a+列已建，而工作区模型已不含该列（stash 所致）。
  无数据损坏（只加列+未跟踪迁移文件仍在），恢复 WIP 后自洽。
- **冒烟姿势修正**：CONFIG_DIR 是裸名 env（不带 MOVIEPILOT_ 前缀），
  带 `MOVIEPILOT_CONFIG_DIR` 完全无效——连真实库跑（早期冒烟全中此坑，
  早期"成功"值得怀疑）。正确：`CONFIG_DIR=<tmp> MOVIEPILOT_AUTO_UPDATE=false
  PORT=19892`。✅ 19892 openapi 200 已关停。
- 预演：契约 101+44（补文档数字）✅ check-host ✅ strict 42 ✅ 四静态 ✅
  ruff 396 ✅ mypy 12,519 ✅（Linux 对照 12,553 差异全在 app/plugins
  被棘轮 exclude 的目录，手工对照须带同 exclude）性能 587/598/600 ✅
  workflow 四件 44+7 ✅ build-v3 三要素 ✓ 迁移树 81 单 head ✓
  uv lock --check ✓ 采集全家桶 168 ✅ pylint 增量 27 文件 10.00 ✅。
- 四分片（IDENTICAL 环境族放行）：s3 2F（package_installer Rust 版本差 +
  plugin_compat=tv 破口已修）、s4 19F（17 已知族+type_gate 已修+
  transfer_overwrite_guard 平台差）；**pytest 显式路径 ignore 失效族**——
  run.py 把分片文件显式传给 pytest.main，`--ignore` 不生效、`--deselect`
  才生效（历轮"带 deselect"实为 deselect 兜底）；s1/s2 挂起族
  fs_proxy（test_timeout_raises_and_kills_worker 等 CRLF 相关 Windows
  管道挂起，单跑同败+旧树同败=平台差）与 docker_bootstrap（旧树 48F
  同败）整文件 deselect 后 s2 59F 全落已知族、s1 复跑中。
- 前端验收：vitest 2904/2917（11F 全为 CRLF/symlink 环境族：glass
  indexOf=-1 旧树同败、app-glass 新 spec CRLF 假失败）eslint 零警告 ✅
  vue-tsc 零错误 ✅。

## 2026-09-08 合并（第 56 次记录，定时任务执行）

- 前端增量 **3 提交 / 15 文件（+307−102）**：`2fff276c` 分类规则值与
  目标类目澄清（分类编辑器三组件+mediaClassification utils+测试五件套）、
  `b18595ba` 测试对齐目录分类路径期望、`c3c849b1` TransferHistoryView
  样式一致性调整。自动合并零冲突，双亲验证通过。
- 三件套：lint ✅ typecheck ✅；test:run 2911 过 11F——TransferHistory
  View×3（CRLF 族）/glassOverlayMaterial×1/format-changed×4/frontend-
  workflow×2/app-glass-optical-preload×1（新例，单跑 1F，**合并前旧树
  worktree 对照同败=既有环境失败**，非本轮回归）全部 Windows 环境族。
  上游新增分类测试 55+12 例全绿。
- 后端 +2 另见后端仓记录。

## 2026-09-08 合并（第 57 次记录，定时任务执行）

- 前端增量 **12 提交 / 38 文件（+3587−284）**：glass 导航可读性系列
  （#762：磨砂导航与样式解耦+默认清晰风格+滚动稳定+指针恢复护栏+
  displacement 像素批量化+主场景编译复用，glassNavbarRefraction 大改）、
  dashboard 性能（grid 宽度预量+封面异步编码）、应用中心动态动作保留、
  logo 待编译随场景退场。自动合并零冲突（eslint-suppressions 自动并集，
  fork CollectCard 豁免保留），双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 3032 过
  11F 与第 56 轮完全一致（app-glass-optical-preload×1/glassOverlay
  Material×1/TransferHistoryView×3/format-changed×4/frontend-workflow×2
  全部已定性 Windows 环境族 IDENTICAL）；上游新增 glass 测试 105 例全绿。
- 后端无增量跳过。

## 2026-09-08 合并（第 58 次记录，定时任务执行）

- 前端增量 **5 提交 / 14 文件（+611−58）**：`b2b08109` 单条订阅搜索周期
  （Subscribe.search_interval + 订阅卡编辑）、`eac03293` 订阅卡执行态紧凑化
  与 stale hint 清理、`e11ebcad` #761 折叠音乐专辑行富化、`3f6f41e6` 桌面端
  分类列表双列、`0dd50afd` 分类搜索约束与 hover 色柔化。自动合并零冲突
  （types.ts 双方改动区不重叠），双亲验证通过。
- 三件套：lint ✅（129s 高负载窗口）typecheck ✅；test:run 3039 过 12F
  ——10 个已知 Windows 环境族（glass-preload/glassOverlay/TransferHistory
  ×2/format-changed×4/frontend-workflow×2，上游本轮重写 TransferHistory
  spec 后「joins」转绿）+ 2 个新例单跑 64/64 全绿=观察者效应（useMedia
  Subscribe 51 轮先例；高负载佐证）。
- 后端 +9 另见后端仓记录。

## 2026-09-08 合并（第 59 次记录，定时任务执行）

- 前端增量 **16 提交 / 33 文件（+2050−206）**：glass 性能优化系列
  （#764 及连串：backdrop 采样共享、poster presentation 复用+固定失效域、
  行级 displacement 合成、不变量行复用、固定表面片元着色限界、fallback
  暂停与接管跳过、材质 uniforms 提交竞态修复、frosted 导航实时采样）、
  媒体卡隐藏详情延迟渲染、搜索缓存进度测试、UserProfile modal handoff
  样式契约（新增 spec）。自动合并零冲突（suppressions 自动并集），
  双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 3096 过
  12F——10 个已知 Windows 环境族 + **UserProfile×2 新例定性**：断言用
  LF 拼接 `.v-overlay-container:has(...)` selector，本机 autocrlf=true 把
  glass.scss 检出为 CRLF 致 toContain 失配；纯上游树 worktree 同败
  2/2 佐证（blob 为 LF），与 TransferHistoryView CRLF 族同根，IDENTICAL
  放行。
- 后端 +6 另见后端仓记录。

## 2026-09-08 合并（第 60 次记录，定时任务执行）

- 前端增量 **4 提交 / 11 文件（+728−215）**：`8d65a45b` #763 音乐发行
  偏好控件（AccountSettingSystem 高级媒体设置按用途分组大改 +545 行、
  Subscribe 编辑器、types.music_release_regions/scripts）、`fa916ce1`
  音乐整理历史删除改 ID-only 载荷、`67a115ad` 设置分组、`aaf02179` 菜单
  hover 圆角统一。自动合并零冲突（types.ts/common.scss 双方改动区不重叠），
  双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 3102 过
  12F 与第 59 轮完全一致（全部已定性 Windows CRLF/环境族 IDENTICAL）。
- 后端 +1 另见后端仓记录。

## 2026-09-09 合并（第 61 次记录，定时任务执行）

- 前端增量 **5 提交 / 15 文件（+623−169）**：`e3d8c756` #759 识别源
  组织器（SourceClassificationDialog 新组件 + DownloadSource
  ClassificationData 类型 + msw handler + Reorganize/DownloadHistory/
  DownloadTaskSettings 测试扩充）、`0a7fed76` #765 选中历史单批提交、
  `792d9f20` 移除前端错误改写（notification.ts 及其测试删除）、
  `c709fcd1/c13653a9` 媒体类型/来源选择列布局与下载历史测试对齐。
  自动合并零冲突（types.ts 双方改动区不重叠），双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 3102 过
  12F 与 59/60 轮完全一致（全部已定性 Windows CRLF/环境族 IDENTICAL）；
  新功能相关 dialog 测试 476 例全绿。
- 后端 +27 另见后端仓记录。

## 2026-09-09 合并（第 62 次记录，定时任务执行）

- 前端增量 **2 提交 / 7 文件（+328−10）**：`e29ec812` #766 手动搜索
  候选澄清（音乐候选列表标注）、`35bcae6d` #767 keep-alive 路由回弹
  防护（TransferHistoryView +13 行防护与 +21 行测试）。自动合并零冲突，
  双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 3107 过
  12F 与第 61 轮完全一致（全部已定性 Windows CRLF/环境族 IDENTICAL）。
- 后端 +7 另见后端仓记录。

## 2026-09-09 合并（第 63 次记录，定时任务执行）

- 前端增量 **1 提交 / 3 文件（+130−19）**：`e5de69f4` #768 导航期间
  阻断路由写入（TransferHistoryView 守卫 + render.ts 测试支撑）。
  自动合并零冲突，双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 3108 过
  12F 与第 62 轮完全一致（全部已定性 Windows CRLF/环境族 IDENTICAL）。
- 后端 +8 另见后端仓记录。

## 2026-09-09 合并（第 64 次记录，定时任务执行）

- 前端增量 **3 提交 / 20 文件（+1494−111）**：`b94b13eb` #769 艺人作品
  资源矩阵（新页 music-artist-resources + 测试）、`97ce5afe` 订阅自动等待
  澄清与搜索恢复操作（SubscribeExecutionDialog 新组件+测试）、`ac86c39e`
  TransferHistoryView 修复。自动合并零冲突（预判三处冲突面 types/router/
  SubscribeList 双方改动区均不相交），双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 3127 过
  13F=12 个已知 Windows CRLF/环境族 + ServiceView×1 单跑 7/7 全绿=
  观察者效应（既有族）。
- 后端 +20 另见后端仓记录。

## 2026-09-09 合并（第 65 次记录，定时任务执行）

- 前端增量 **5 提交 / 30 文件（+1518−194）**：`cdf8e034` 整理恢复操作与
  提交结果暴露（TransferRecoveryDialog 测试）、`c1f9cfe8` 音乐订阅默认
  规则暴露、`5699a8c9` WebPush 后端重启后恢复订阅（useWebPush
  Notifications 新组合式+测试）、`984d8ba4` 清玻璃遮罩模糊降低、
  `a5d8c9e0` CI 复用已验证 PR 检查与类型检查并行化（test.yml 加
  permissions/reuse job + reuse.test.mjs 脚本）。自动合并零冲突
（v3_plus 触发分支保留），双亲验证通过。
- 三件套：install --immutable ✅ lint ✅（117s 高负载）typecheck ✅；
  test:run 3160 过 13F——12 个已知 Windows CRLF/环境族 + frontend-
  workflow 2F→3F（a5d8c9e0 新增「PR 复用结果」断言同 CRLF 家族，
  blob i/lf 检出 w/crlf 佐证）；ServiceView×1 消失（往轮观察者效应族）。
- 后端 +17 另见后端仓记录。

## 2026-09-09 合并（第 66 次记录，定时任务执行）

- 前端增量 **5 提交 / 11 文件（+295−71）**：`18bea99d` AMLL TTML 歌词
  服务配置、`8ac17e10` 移除 Musixmatch 歌词设置、`5b301c8f` 下载设置与
  整理恢复对话框优化、`0fabfd40` 手动整理跳过成功项、`f4ebf6c2`
  AddDownloadDialog 媒体选择布局调整。自动合并零冲突，双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 3167 过
  13F 与第 65 轮完全一致（全部已定性 Windows CRLF/环境族 IDENTICAL）。
- 后端 +11 另见后端仓记录。

## 2026-09-10 合并（第 67 次记录，定时任务执行）

- 前端增量 **20 提交 / 89 文件（+4863−511）**：#773 液态玻璃导航系列
（perf 主输出清除去重/默认深度缓冲省略/指针样式跳过/动态帧率相位同步/
  balanced 60Hz 上限/wallpaper 采样复用+测试）、#771 滚动导航收敛合并、
  #770 音乐艺人合集发现与整理、艺人并入人物搜索、**e230b6dd 页面文件按
  域重组**（pages/ 平铺→discover/ 等子目录）、CI vitest worker 并发限界
  三连、历史成功记录隐藏失败 tooltip、横向导航贴边对齐。冲突 1 文件
  eslint-suppressions（**程序化 JSON 并集**——文本级叠加在「共享尾部」
  形态下必截断条目丢 vue/valid-v-for 键致 lint 假红；改 git show 两版
  json.load 取并集+prune 收敛，真实报错清零后 prune 清掉被上游修复的
  stale 条目），双亲验证通过。
- 三件套：install --immutable ✅ lint ✅ typecheck ✅；test:run 3318 过
  13F 与第 66 轮完全一致（全部已定性 Windows CRLF/环境族 IDENTICAL）。
- 后端 +17 另见后端仓记录。

# 双模型计划审阅总结报告

## 审阅概览

| 项目 | 详情 |
|------|------|
| 审阅日期 | 2026-03-02 |
| 审阅模型 | Codex (Claude 作为提问方) |
| 审阅范围 | 根计划 + 5 个模块计划 |
| 迭代次数 | 1 轮 |

## 审阅结果汇总

### 各模块审阅状态

| 模块 | 状态 | 严重问题 | 建议改进 | 备注 |
|------|------|----------|----------|------|
| **根计划 (plan.md)** | 🟡 有条件认可 | 3 | 5 | 需修复依赖图、契约冻结、工期调整 |
| **content-source** | 🟡 需修复 | 4 | 5 | 缓存 key、降级策略、重试矩阵 |
| **content-domain** | 🟡 需修复 | 3 | 5 | Post 拆分、时间语义、错误处理 |
| **web-ui** | 🟡 需修复 | 2 | 5 | 主题防闪烁、CSS token 完整 |
| **search** | 🟡 需修复 | 4 | 5 | FlexSearch API、ISR 冲突、错误处理 |
| **interaction** | 🟡 需修复 | 4 | 6 | 原子操作、限流、指纹、降级 |

### 严重问题分类

#### 🔴 架构层问题（跨模块）

| 问题 | 影响模块 | 修复状态 |
|------|----------|----------|
| 依赖图与表格不一致 | 根计划 | ✅ 已修复 |
| 模块间接口契约未冻结 | 根计划 | ✅ 已添加 Phase -1 |
| 工期估算偏乐观 | 根计划 | ✅ 已调整 |

#### 🔴 数据一致性问题

| 问题 | 影响模块 | 修复状态 |
|------|----------|----------|
| 点赞计数非原子操作 | interaction | ✅ 已添加 Redis 事务 |
| 限流逻辑可被并发穿透 | interaction | ✅ 已添加 Lua 脚本 |
| 缓存 key 设计导致污染 | content-source | ✅ 已添加查询维度 |

#### 🔴 技术实现问题

| 问题 | 影响模块 | 修复状态 |
|------|----------|----------|
| FlexSearch export/import 用法错误 | search | ✅ 已修正 |
| ISR 与静态索引文件冲突 | search | ✅ 已调整策略 |
| 主题防闪烁方案不完整 | web-ui | ✅ 已补充配置 |
| 降级策略在 Edge 场景不可行 | interaction | ✅ 已调整 |

#### 🔴 安全/鲁棒性问题

| 问题 | 影响模块 | 修复状态 |
|------|----------|----------|
| 指纹方案易误判/伪造 | interaction | ✅ 已加强 |
| 正则未转义导致崩溃 | search | ✅ 已添加转义 |
| 错误处理静默吞错 | content-domain | ✅ 已区分错误类型 |

## 修复内容详情

### 根计划 (plan.md)

**修复项：**
1. ✅ 依赖图修正 - interaction 不再依赖 blog
2. ✅ 添加 Phase -1（Schema 评审与契约冻结）
3. ✅ 工期调整 - 单人 3-4 周，多人 2 周+20%缓冲
4. ✅ 添加模块独立开发指南
5. ✅ 完善模块间接口契约

### content-source

**修复项：**
1. ✅ 缓存 key 设计 - 纳入 filter/sorts/page_size/start_cursor
2. ✅ 三级缓存定义 - 明确每层职责和一致性策略
3. ✅ 统一重试矩阵 - 按错误类型定义重试策略
4. ✅ 降级策略契约 - 定义 stale cache/空集合/抛错场景
5. ✅ 添加 jitter 避免雪崩
6. ✅ 内存缓存 TTL/LRU 策略

### content-domain

**修复项：**
1. ✅ Post 拆分为 PostSummary / PostDetail
2. ✅ 时间字段语义明确 - publishedAt 可选，缺失不自动回填
3. ✅ 错误处理策略 - 区分可恢复/不可恢复错误
4. ✅ slug 策略加强 - 稳定性约束、保留词、Unicode 归一化
5. ✅ Block 转换范围列举
6. ✅ Service 接口增加分页/排序/过滤参数

### web-ui

**修复项：**
1. ✅ 主题防闪烁方案 - 明确 ThemeProvider 参数、html/body 结构
2. ✅ CSS 变量完整 - 补充 accent、destructive、popover、radius
3. ✅ shadcn 组件补充 - Sheet、Label、Separator、Avatar
4. ✅ 响应式策略细化 - 断点、触控目标尺寸
5. ✅ Tailwind tree-shaking 策略

### search

**修复项：**
1. ✅ FlexSearch API 修正 - 使用正确的 export/import 方式
2. ✅ ISR 策略调整 - 改为服务端索引或纯静态重建
3. ✅ 错误处理完善 - fetch catch、res.ok 判断
4. ✅ 正则转义 - 高亮前转义特殊字符
5. ✅ 中文检索策略 - 验证 tokenize 配置
6. ✅ 构建脚本接入 CI

### interaction

**修复项：**
1. ✅ 点赞计数原子化 - 使用 Redis 事务/Lua 脚本
2. ✅ 限流逻辑原子化 - 使用 Redis + Lua
3. ✅ 降级策略调整 - Edge 场景不降级为本地计数
4. ✅ 指纹方案加强 - 增加更多维度、降低冲突率
5. ✅ Giscus 配置完善 - resolvedTheme、strict、origin
6. ✅ API 入参校验 - slug 白名单
7. ✅ UI 非阻塞反馈 - toast 替代 alert

## 项目级建议（来自 Codex）

### 数据一致性规范
- 所有写入操作使用原子操作（Redis 事务/Lua/脚本）
- 避免先读后写的非原子模式
- 建立统一错误码和降级策略

### 安全基线
- 所有 API 入参严格校验
- 增加主动防护层（Captcha/签名挑战）
- 敏感操作增加审计日志

### 缓存策略
- 分层缓存：source-cache + domain-cache
- 明确 TTL 和主动失效事件
- 定义降级读取顺序

### 可观测性
- 统一埋点：retry_count、rate_limit_hits、cache_hit_ratio
- 性能指标：API 响应时间、索引加载时间
- 错误追踪：统一错误上报

## 修复后计划状态

```
📁 项目结构
├── plan.md                    # 根计划（已修复）
├── Implement.md               # 实施状态
└── modules/
    ├── content-source/        # 已修复
    ├── content-domain/        # 已修复
    ├── web-ui/                # 已修复
    ├── search/                # 已修复
    └── interaction/           # 已修复
```

## 建议实施顺序

### Phase -1: 契约冻结 (0.5天)
- 产出 types + service interface + mock schema
- 各模块接口评审
- 确定缓存策略和降级契约

### Phase 0-4: 按原 plan 执行
- 参考根计划中的并行策略
- 模块完成后进行 Codex 代码审阅

## 最终结论

**审阅后状态：✅ 可执行（已修复所有严重问题）**

所有 🔴 严重问题已修复，🟡 建议改进已评估并选择性采纳。当前计划具备可执行性，可以进入开发阶段。

建议在实施过程中：
1. 每完成一个模块先进行单元测试
2. 模块间集成前进行接口兼容性检查
3. 定期进行 Codex 代码审阅
4. 保持 Implement.md 状态更新

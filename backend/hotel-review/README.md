# Hotel Review Gap Coach (Node.js / Express)

这是一版把你当前 Python 原型迁移到 **Node.js + Express** 的实现，并补上了两件你现在最需要的事：

1. **根据酒店已有 description + reviews 自动判断哪些 review 维度最关键、最缺、最旧、最矛盾**
2. **结合顾客画像筛掉不适合提的问题，再用 AI 做最终重排**

## 这版相当于替你修了什么

### 1) 保留了你现在的核心逻辑
- `snapshot_builder(2).py` → `src/services/snapshotBuilder.js`
- `followup.py` → `src/services/followupScorer.js`
- `taxonomy(2).py` → `src/config/taxonomy.js`
- `evidence_extractor(2).py` → `src/services/evidenceExtractor.js`

### 2) 修了你现在最关键的数据映射问题
你当前 `official_facts(2).py` 用的是这些列名：
- `property_amenity_wifi`
- `property_amenity_breakfast`
- `property_amenity_elevator`
- `property_amenity_shuttle`

但你实际上传的 Description CSV 里对应的是：
- `property_amenity_internet`
- `property_amenity_food_and_drink`
- `property_amenity_accessibility`
- `property_amenity_parking` / `property_amenity_family_friendly`

所以旧版会把很多官方 amenities 误判成 `not_listed`。这版已经按你**真实 CSV 列结构**改好了。

### 3) 新增了用户画像过滤
接口现在支持传：
- `hasChildren`
- `hasDietaryRestrictions`
- `broughtCar`
- `needsAirportShuttle`
- `usedBreakfast`
- `lateArrival`
- `mobilityNeeds`
- `travelerType`

例如：
- 没带孩子，就不优先问 `dietary_options`
- 没开车，就不问 `parking`
- 商务客，会更优先问 `wifi / noise / hvac`

### 4) 新增了 AI 重排
不是让 AI 从零瞎猜，而是：
- 先用规则和统计方法算出一批候选问题
- 再把候选问题、酒店官方信息、顾客画像、当前 draft review 一起喂给 AI
- 让 AI 只在**可解释的候选集合里**做最终挑选

这样比纯 LLM 更稳，也更容易 debug。

---

## 目录

```bash
backend/hotel-review/
├── README.md
├── src/
│   ├── app.js
│   ├── config/
│   │   ├── settings.js
│   │   └── taxonomy.js
│   ├── db/
│   │   └── database.js
│   ├── routes/
│   │   └── properties.js
│   ├── services/
│   │   ├── aiReranker.js
│   │   ├── evidenceExtractor.js
│   │   ├── followupScorer.js
│   │   ├── officialFacts.js
│   │   ├── profileMatcher.js
│   │   └── snapshotBuilder.js
│   └── utils/
│       └── text.js
└── scripts/
    └── bootstrapFromCsv.js
```

---

## 安装（已并入 monorepo 根目录）

在仓库根目录：

```bash
npm install
cp .env.example .env
```

把 `.env` 里的这两个路径改成你的实际文件路径：

```bash
DESCRIPTION_CSV=/mnt/data/Description_PROC(2).csv
REVIEWS_CSV=/mnt/data/Reviews_PROC(2).csv
```

如果要启用 AI 重排，再填：

```bash
OPENAI_API_KEY=...
ENABLE_AI_RERANK=true
```

---

## 先导入 CSV

```bash
npm run bootstrap:hotel-review
```

这个脚本会做 5 件事：

1. 建 SQLite 表
2. 导入 property description
3. 从 description 里抽取 official facts
4. 导入 reviews，并做 rule-based evidence extraction
5. 生成 snapshot（MISSING / STALE / CONFLICT / SATURATED）

---

## 启动服务

与图片生成 API 共用同一后端进程（仓库根目录）：

```bash
npm run dev:backend
```

默认端口：`8787`（可用根目录 `.env` 的 `PORT` 覆盖）。HTTP 前缀为 `/api/hotel-review/v1`（见下方）。

---

## 核心接口

### 1. 看某个酒店当前缺口

```bash
GET /api/hotel-review/v1/properties/:propertyId/snapshot
```

### 2. 看候选追问列表

```bash
POST /api/hotel-review/v1/properties/:propertyId/candidates
Content-Type: application/json

{
  "draftText": "Wi-Fi was good and the room was quiet.",
  "askedFacets": ["ROOM_INFRA:wifi_available"],
  "guestProfile": {
    "travelerType": "business",
    "hasChildren": false,
    "broughtCar": true,
    "usedBreakfast": false,
    "needsAirportShuttle": false,
    "lateArrival": true,
    "mobilityNeeds": false
  },
  "limit": 5,
  "useAi": true
}
```

### 3. 直接拿最佳 follow-up question

```bash
POST /api/hotel-review/v1/properties/:propertyId/followup
Content-Type: application/json

{
  "draftText": "Wi-Fi was good and the room was quiet.",
  "askedFacets": ["ROOM_INFRA:wifi_available"],
  "guestProfile": {
    "travelerType": "business",
    "hasChildren": false,
    "broughtCar": true,
    "usedBreakfast": false
  },
  "useAi": true
}
```

---

## 你最关心的接入方式

如果你前端已经是别的系统，只想把“AI 问题推荐”接进去，那么最少只需要接这一个接口：

```bash
POST /api/hotel-review/v1/properties/:propertyId/followup
```

前端把这几个东西传进去即可：
- `propertyId`
- 当前用户已写的 review 草稿 `draftText`
- 已经问过的问题 `askedFacets`
- 用户画像 `guestProfile`

服务端返回：
- 该问哪个 facet
- 为什么问它
- 问题文本
- 选项
- debug 分数

---

## 一个很实际的提醒
这版里 **AI 不是拿来全量重做 5999 条 review extraction** 的，因为那样成本会比较高。

当前默认策略是：
- **批量导入阶段**：规则抽取为主
- **实时追问阶段**：AI 重排为主

这是当前最省钱、最稳、也最容易上线的方式。

如果你后面要，可以继续加：
- 针对“规则抽不到”的评论做小批量 AI extraction
- 多语言 review 的 AI 抽取

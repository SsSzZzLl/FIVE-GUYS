# 后端服务说明

该目录包含 NFT 游戏排行榜服务的 Node.js/TypeScript 后端，负责提供基础的排行榜数据读写能力。

## 功能概览

- 提供 RESTful API，用于查询排行榜、提交分数、重置排行榜。
- 使用 JSON 文件持久化数据，方便快速本地开发与演示。
- 支持环境变量配置存储路径、服务器端口等参数。
- 内置请求体验证、统一错误处理、日志。

## 主要文件结构

```
backend/
├── src/
│   ├── index.ts                 # 应用入口与服务器启动
│   ├── config/
│   │   └── database.ts          # JSON 数据库读写工具
│   ├── controllers/
│   │   └── leaderboard.controller.ts
│   ├── services/
│   │   └── leaderboard.service.ts
│   ├── models/
│   │   └── leaderboard.model.ts
│   └── routes/
│       └── leaderboard.routes.ts
├── package.json
├── tsconfig.json
└── README.md
```

## 快速开始

```bash
cd backend
npm install
npm run dev      # 启动开发服务器
```

默认在 `localhost:4000` 启动服务。可通过 `.env` 或系统环境变量覆盖：

- `PORT`：服务监听端口（默认 `4000`）
- `LEADERBOARD_STORAGE_PATH`：排行榜数据文件存储路径（默认 `../storage/leaderboard.json`）

## 可用脚本

- `npm run dev`：使用 `ts-node-dev` 热重载开发模式
- `npm run build`：编译 TypeScript 到 `dist/`
- `npm start`：运行编译后的 JavaScript 版本
- `npm run clean`：清理 `dist/`

## API 速览

| 方法 | 路径                 | 说明                 |
| ---- | -------------------- | -------------------- |
| GET  | `/api/leaderboard`   | 获取排行榜列表       |
| POST | `/api/leaderboard`   | 提交或更新玩家分数   |
| DELETE | `/api/leaderboard` | 清空排行榜（调试用） |

详细字段校验与响应格式请参见各个控制器与服务实现。README 只提供简要概览。欢迎根据业务需要扩展持久化方案或接入真实数据库。


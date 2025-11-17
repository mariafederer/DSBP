# DSBP - Digital Software Building Platform

一个现代化的项目管理平台，支持看板式任务管理、多人协作、评论系统和实时通知。

## 快速开始

### 0. 配置环境变量

项目根目录需要一个未提交的 `.env` 文件，最小内容如下（可根据需要调整）：

```bash
DATABASE_URL=sqlite:///./data/dsbp.db
SECRET_KEY=CHANGE_ME_SECRET
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

> `.env` 默认被忽略，提交前请确认未包含敏感信息。

### 1. 安装依赖

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Linux/Mac
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. 启动应用

```bash
# Windows - 双击或运行
start.bat

# Linux/Mac
chmod +x start.sh
./start.sh

# 或手动启动
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 访问应用

- **主页**: http://localhost:8000
- **注册**: http://localhost:8000/register
- **API文档**: http://localhost:8000/docs

## 核心功能

- ✅ 用户注册与登录（JWT认证）
- ✅ 项目管理（公开/私有/指定用户）
- ✅ 看板式任务管理（新任务/计划中/进行中/已完成）
- ✅ 任务截止日期管理
- ✅ 多人分配任务
- ✅ 评论系统（支持@提及）
- ✅ 通知中心

## 使用指南

### 首次使用

1. **注册账户** - 访问 `/register` 创建账户
2. **登录系统** - 使用用户名和密码登录
3. **创建项目** - 点击左侧"+"按钮创建项目
4. **添加任务** - 点击顶部"+ Add Task"添加任务
5. **管理任务** - 点击任务卡片查看详情并编辑

### 主要操作

| 功能 | 操作方法 |
|------|---------|
| 创建项目 | 左侧边栏 "+" 按钮 |
| 添加任务 | 顶部 "+ Add Task" 按钮 |
| 查看任务详情 | 点击任务卡片 |
| 修改任务状态 | 任务详情中选择状态 |
| 分配用户 | 任务详情 → Assignees → + Add |
| 设置截止日期 | 任务详情 → Due date |
| 添加评论 | 任务详情底部输入框 |
| @提及用户 | 评论中输入 @用户名 |

### 用户选择器

在分配任务或共享项目时：
- **All Users选项** - 勾选后自动选择所有用户
- **搜索功能** - 输入用户名或邮箱快速查找
- **多选支持** - 可以选择多个用户

## 技术栈

- **后端**: FastAPI + SQLAlchemy + SQLite
- **前端**: 原生 JavaScript + HTML5 + CSS3
- **认证**: JWT (python-jose)
- **密码加密**: bcrypt

## 项目结构

```
js_python/
├── main.py                 # FastAPI 入口
├── app/                    # 后端应用
│   ├── api/
│   │   └── routes.py       # API路由定义
│   ├── core/
│   │   ├── app.py          # 应用工厂与中间件
│   │   └── database.py     # 数据库配置
│   ├── models/
│   │   └── __init__.py     # SQLAlchemy模型
│   ├── schemas/
│   │   └── __init__.py     # Pydantic校验
│   ├── services/
│   │   └── auth.py         # 认证/鉴权逻辑
│   ├── static/             # 后端静态资源（占位）
│   └── templates/          # 模板占位
├── frontend/               # 前端资源
│   ├── public/             # 直接暴露的HTML
│   │   ├── index.html
│   │   ├── login.html
│   │   └── register.html
│   └── src/                # JS/CSS 源文件
│       ├── components/     # 通用脚本
│       ├── pages/          # 页面脚本
│       └── assets/
│           └── styles/     # 样式文件
├── data/
│   └── dsbp.db             # SQLite数据库
├── tests/                  # 自动化测试
├── start.bat / start.sh    # 启动脚本
├── reset_db.bat / reset_db.sh
└── requirements.txt
```

> `.env` 文件因安全策略未纳入仓库，请根据说明手动创建。

## 常见问题

### ❌ 添加任务时报错 "table tasks has no column named due_date"

**原因**: 数据库使用旧的表结构

**解决方案**:
```bash
# Windows
reset_db.bat

# Linux/Mac
./reset_db.sh
```

⚠️ 注意：重置数据库会清空所有数据

### ❌ 端口被占用 (Address already in use)

**解决方案**: 更换端口
```bash
uvicorn main:app --reload --port 8001
```

### ❌ 登录后空白页面

**解决方案**:
1. 清除浏览器缓存 (Ctrl+Shift+Delete)
2. 强制刷新 (Ctrl+F5)
3. 检查浏览器Console是否有错误
4. 确认后端服务正在运行

### ❌ ModuleNotFoundError

**解决方案**:
```bash
# 确保虚拟环境已激活
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# 重新安装依赖
pip install -r requirements.txt
```

## API 文档

启动服务后访问: http://localhost:8000/docs

主要接口：
- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `GET /projects` - 获取项目列表
- `POST /projects` - 创建项目
- `GET /projects/{id}/tasks` - 获取任务列表
- `POST /tasks` - 创建任务
- `PATCH /tasks/{id}` - 更新任务
- `POST /comments` - 添加评论
- `GET /notifications` - 获取通知

## 数据库管理

### 重置数据库
```bash
# 停止服务器 (Ctrl+C)
# 运行重置脚本
reset_db.bat  # Windows
./reset_db.sh  # Linux/Mac
```

### 备份数据库
```bash
# Windows
copy data\dsbp.db data\dsbp_backup.db

# Linux/Mac
cp data/dsbp.db data/dsbp_backup.db
```

## 安全建议

⚠️ **生产环境部署前必须修改**:

1. **修改密钥** - 在 `app/services/auth.py` 中修改 `SECRET_KEY`
2. **使用生产数据库** - PostgreSQL 或 MySQL
3. **启用HTTPS** - 使用反向代理（Nginx）
4. **配置CORS** - 限制允许的源
5. **环境变量** - 使用 `.env` 文件管理敏感信息

## 开发说明

### 修改代码后
- 后端：使用 `--reload` 参数会自动重载
- 前端：刷新浏览器即可

### 查看日志
```bash
# 详细日志
uvicorn main:app --reload --log-level debug

# 保存到文件
uvicorn main:app --reload > logs.txt 2>&1
```

### 数据库检查
```bash
# 使用 sqlite3
sqlite3 data/dsbp.db

# 查看表结构
.schema tasks

# 查看数据
SELECT * FROM tasks;

# 退出
.quit
```

## 最佳实践

### 项目组织
- 按产品/功能创建项目
- 使用清晰的命名
- 合理设置可见性权限

### 任务管理
- 标题简洁明了
- 重要任务设置截止日期
- 及时更新任务状态
- 分配给具体负责人

### 团队协作
- 使用评论讨论细节
- @提及相关人员
- 定期查看通知
- 保持任务信息更新

## 许可证

本项目仅供学习和演示使用。

## 更新日志

### v1.0.0 (2025-11-16)
- ✅ 初始版本发布
- ✅ 完整的项目和任务管理功能
- ✅ 看板视图和任务详情面板
- ✅ 多人协作和通知系统

---

**需要帮助？** 查看 API 文档: http://localhost:8000/docs

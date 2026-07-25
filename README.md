# 理论题库 · 答题练习

人工智能训练师理论题库 + 操作题的前端练习工具。

## 目录结构

```
frontend/
├── resource/         题库 JSON 数据（不动）
│   ├── single.json        300 道单选题
│   ├── multi.json         300 道多选题
│   ├── judge.json         300 道判断题
│   └── practical.json      40 道操作题
│
├── src/              源码（手写）
│   ├── index.html         页面结构
│   ├── style.css          样式
│   ├── app.js             理论题 + 错题集逻辑
│   └── practical.js       操作题逻辑
│
├── dist/             打包产物——多文件版
│   ├── index.html         双击打开
│   ├── style.css / app.js / practical.js / data.js / data_practical.js
│
├── dist_single/      打包产物——单文件版
│   └── index.html         双击打开，全部内联，不依赖外部文件
│
└── bundle.py         打包脚本
```

## 使用方式

### 刷题

两种方式任选：

| 方式 | 入口 |
|---|---|
| 多文件版 | 双击 `dist/index.html` |
| 单文件版 | 双击 `dist_single/index.html`（无需任何外部文件） |

### 修改源码后重新打包

```bash
python3 bundle.py
```

输出到 `dist/` 和 `dist_single/`。

### 重新爬取数据

数据爬取在项目根目录的 `scrape/` 下，爬完更新 `resource/*.json` 后重新打包。

## 功能

| 功能 | 说明 |
|---|---|
| 📖 单选题 | 300 道，选答案判对错 |
| 📚 多选题 | 300 道，多选提交判分 |
| ⚖️ 判断题 | 300 道，正确/错误二选一 |
| ❌ 错题集 | 自动记录错题，连续全对自动移出，支持跨设备导入导出 |
| 🛠 操作题 | 40 道代码填空，双击 / Cmd+Enter 显示答案 |

### 快捷键

| 按键 | 功能 |
|---|---|
| `←` / `→` | 上一题 / 下一题 |
| `Space` | 下一题 |
| `Enter` | 提交判对错 |
| `A` | 显示/隐藏答案 |
| `Cmd+Enter` / `Ctrl+Enter` | 操作题中显示/隐藏当前空答案 |
| 双击 input | 操作题中显示/隐藏当前空答案 |

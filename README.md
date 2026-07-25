# AI_trainer_class3_practice

人工智能训练师（三级）理论题库 + 操作题练习工具。GitHub Pages 在线访问。

## 目录结构

```
├── index.html           单文件版（Pages 入口，所有内容内联）
├── 3.1答案/              操作题 3.1.x 参考图片
├── src/                 源码（手写）
│   ├── index.html
│   ├── style.css
│   ├── app.js           理论题 + 错题集逻辑
│   └── practical.js     操作题逻辑
├── dist/                多文件版
│   └── index.html       双击本地打开
├── resource/            题库数据（JSON + 3.1.x MD 答案）
├── bundle.py            打包脚本
└── README.md
```

## 功能

| Tab | 内容 |
|---|---|
| 📖 单选题 | 300 道 |
| 📚 多选题 | 300 道 |
| ⚖️ 判断题 | 300 道 |
| ❌ 错题集 | 自动记录，连续全对移出，支持导出导入 |
| 🛠 操作题 | 40 道（含代码填空 + 3.1.x 分析报告参考答案） |

### 操作题快捷键

| 按键 | 功能 |
|---|---|
| `Cmd+Enter` / `Ctrl+Enter` | 显示/清空当前空答案 |
| 按钮「显示本空答案」 | 切换该题所有答案 |

## 更新流程

```bash
# 1. 修改 src/ 下的源码

# 2. 重新打包
python3 frontend/bundle.py

# 3. 提交推送
cd frontend && git add -A && git commit -m "update" && git push
```

## 本地开发

```bash
python3 bundle.py          # 打包
open dist/index.html       # 多文件版
open index.html            # 单文件版
```

## 数据更新

爬虫在仓库根目录 `scrape/` 下，爬完更新 `resource/*.json` 后重新打包。

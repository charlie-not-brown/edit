# 条目编辑器 · EdgeOne + GitHub 自动化 + 飞书通知版

这个版本保留：

- `index.html`：条目编辑器
- `admin.html`：审核后台
- `contributors.html`：最近更新
- `success.html` / `fail.html`：提交成功 / 失败页
- `cloud-functions/api/*`：EdgeOne Makers / EdgeOne Pages 的 Node Functions 后端接口

提交后会：

1. 把每一条新增 / 修改 / 删除写入 GitHub 仓库的 `data/submissions/pending/*.json`。
2. 发送飞书机器人通知。
3. 管理员在 `admin.html` 里单条通过 / 拒绝。
4. 通过后写入 `data/submissions/accepted/*.json`，并自动更新 `data/recent-changes.json`。
5. `contributors.html` 会读取 `data/recent-changes.json` 并显示为「最近更新」。

## EdgeOne 部署结构

仓库根目录应当是：

```text
index.html
admin.html
contributors.html
success.html
fail.html
styles.css
app.js
data.js
assets/
cloud-functions/
data/
```

注意：这版已经改成 EdgeOne Node Functions，不再使用 Cloudflare Pages 的 `/functions` 目录。

EdgeOne Node Functions 的函数文件放在：

```text
cloud-functions/api/
```

例如：

```text
cloud-functions/api/submit.js        → /api/submit
cloud-functions/api/logs.js          → /api/logs
cloud-functions/api/admin/list.js    → /api/admin/list
```

## EdgeOne 环境变量

在 EdgeOne Pages / Makers 项目设置里添加：

```text
FEISHU_WEBHOOK=飞书自定义机器人 webhook
GITHUB_TOKEN=GitHub fine-grained token
GITHUB_OWNER=你的 GitHub 用户名或组织名
GITHUB_REPO=仓库名
GITHUB_BRANCH=main
ADMIN_SECRET=tim1989
```

`GITHUB_BRANCH` 如果你的默认分支不是 `main`，改成实际分支名。

环境变量修改后，重新部署一次。

## GitHub Token 权限

建议使用 GitHub Fine-grained personal access token，只给这个仓库权限：

```text
Repository permissions:
Contents: Read and write
```

不要把 GitHub Token 写进前端文件。它只放在 EdgeOne 环境变量里。

## 飞书机器人

在飞书中建一个只有你自己的群，添加自定义机器人，复制 webhook 到 `FEISHU_WEBHOOK`。

第一版先不要开启签名校验，确认能收到通知后再说。

## 审核后台

打开：

```text
/admin.html
```

输入 `ADMIN_SECRET` 对应的密钥。当前建议：

```text
tim1989
```

- 通过：从 pending 移除，保存到 accepted，并写入最近更新。
- 拒绝：从 pending 移除，不写入最近更新。
- 删除已处理申请：只删除 `data/submissions/accepted/*.json` 里的提交记录，不影响最近更新、条目数据或 Notion。
- 清理 30 天前已处理申请：手动按钮触发，只清理 accepted 提交记录，不影响最近更新、条目数据或 Notion。

## 说明

这个版本不会自动修改 Notion，也不会自动修改 `data.js`。它负责把访客提交的内容自动保存到 GitHub，并生成最近更新日志。你仍然根据通知内容手动修改 Notion 正式数据库。

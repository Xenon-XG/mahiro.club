# 真寻的日常手记 · mahiro.club

献给《别当哥哥了！》绪山真寻的中文非官方同好站。相册以动画片段为线索，支持按场景筛选、阅读单篇手记和在当前浏览器收藏。角色档案与各篇手记附有动画官网出处。

## 在 Cloudflare Workers 部署

这是一个使用 Workers Static Assets 的静态站点。HTML、CSS、JavaScript 和图片均在 `public/` 中，可直接部署。

1. 在 Cloudflare Workers 的 Git 仓库导入流程中连接 `Xenon-XG/mahiro.club`。
2. Worker 名称填 `mahiro-club`，分支选 `main`，从仓库根目录运行。构建命令留空，部署命令填 `npx wrangler@4 deploy`。
3. 确认同一 Cloudflare 账户里已激活 `mahiro.club` 这个 zone，再执行首次部署。`wrangler.jsonc` 已声明该根域为 Worker 的自定义域名。若域名已有冲突的 CNAME，先在 Cloudflare 核实它当前服务的站点。

## 本地预览

在仓库根目录运行 `npx wrangler@4 dev`，打开终端显示的本地地址。手动部署可运行 `npx wrangler@4 login` 和 `npx wrangler@4 deploy`。

- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Workers Builds 设置](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Worker 自定义域名](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

## 图像与文字

页面介绍和中文手记为本站撰写。动画画面与角色原作版权归 ©ねことうふ・一迅社／「おにまい」製作委員会。剧照取自[动画官网](https://onimai.jp/)，用于相应剧集的介绍；本站与制作方无隶属关系。

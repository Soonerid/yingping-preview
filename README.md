# 映屏

在电脑上预览网页的手机与折叠屏效果，支持本地 HTML、开发服务器和网页链接。

**[下载 Windows 使用包](https://github.com/Soonerid/yingping-preview/releases/latest)** · 项目采用 [MIT 许可](LICENSE)

## 使用

1. 下载 `yingping-windows-x64.zip`，完整解压，双击 `映屏.exe`。不用安装 Node.js 或 Python，保留整个运行文件夹。
2. 点「本地 HTML」选择文件或粘贴代码，也可以拖入 HTML；有图片、CSS、JS 的页面，请保留入口目录及子目录中的素材结构。
3. React、Vue 或带后端的项目，先启动项目服务，再把地址填进顶部输入框，例如 `http://localhost:3000/`。
4. 右上角选机型，左侧切换折叠内外屏、横竖屏、缩放和浅色／深色顶栏。默认 Pura X Max。
5. 保存页面后点刷新或「重新读取」；粘贴的 HTML 需重新粘贴修改后的代码。

「适合窗口」看整体，「100%」看细节。底部 CSS px 表示网页可用尺寸。时间、电量、挖孔与灵动岛为参考示意；正式发布前还需真机补测。

页面没样式，检查是否完整解压、素材路径是否正确；网址打不开，先确认项目服务已启动。本地 HTML 不主动上传，网页自身的外部接口和资源仍会正常联网。

## 继续开发

需要 Node.js 22.12+；完整测试和网页版另需 Python 3。在源码目录运行：

```text
npm test                 # 检查现有功能
npm run dev:web          # 启动轻量网页版
npm run build:windows    # 构建 Windows 使用包
```

界面在 `index.html`、`studio.css`、`studio.js`；机型参数在 `devices.js`；桌面功能在 `desktop/`。构建成品在 `outputs/`，依赖与临时数据在 `work/`。自己的页面放在工具之外，可一直复用。

可修改、分发和商业使用，保留许可声明即可。第三方许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

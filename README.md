# Novel-to-Screenplay

Novel-to-Screenplay: 小说自动改剧本工具
这是一个把小说文本自动转换成影视剧本格式的简单 Web 工具。核心功能是通过调用大模型 API，把长篇的小说按“幕、场景、节拍”重新梳理，并输出成更好读的 YAML 剧本格式。  
📺 演示视频  
视频链接：点击查看演示视频:https://www.bilibili.com/video/BV18tE46CEoa/?spm_id_from=333.1387.homepage.video_card.click&vd_source=28fda5fadb993dc1662abeed7576f25f  
📂 项目文件目录
代码已经按照要求分好了文件夹，干净整洁：
```text
Novel-to-Screenplay/
├── docs/
│     └── schema.html                   # 剧本 YAML 格式的定义说明文档
├── examples/
│     └── screenplay_2026-06-06.yaml    #样例测试结果
├── src/
│   ├── app.js                          # 核心 JS 逻辑：调用大模型 API、处理流式传输
│   └── style.css                       # 界面样式表
├── config.js                           # 配置文件（配 API Key 和大模型接口地址）
├── index.html                          # 网页主页入口
└── README.md                           # 本说明文档
```
🛠️ 怎么在本地跑起来
这个项目非常轻量，不需要安装任何 npm 包，也不需要搭建复杂的运行环境，开箱即用：

1. 下载项目到本地
你可以直接下载 ZIP 包解压，或者用 Git 克隆：

```bash
git clone [https://github.com/w123-w78/Novel-to-Screenplay.git](https://github.com/w123-w78/Novel-to-Screenplay.git)
cd Novel-to-Screenplay
```
2. 修改配置文件
用记事本或者任意编辑器打开根目录下的 config.js，一定注意修改供应商和api key两个，填入你自己的大模型 API Key 和接口地址：
```Javascript
const CONFIG = {
    provider: "OpenAI",             // 调用的服务商（如 OpenAI、DeepSeek 等）
    apiKey: "你的_API_KEY",          // 填入你的 API Key
    endPoint: "https://...",        // 填入接口代理地址
    model: "deepseek-r1"            // 调用的模型名称
};
```
3. 双击运行
配置好后，直接在电脑上双击 index.html 文件，用任意浏览器打开，就能直接在网页上粘贴小说并看到流式生成的剧本了。

📝 简单说明
为什么输出 YAML 格式：因为大模型在流式生成长文本时，写 JSON 很容易因为少个逗号或右括号导致报错。YAML 全靠空格缩进，模型不容易出错，而且看起来像剧本一样直观。

开发流程：本项目严格按照比赛要求，通过多个 Pull Request（PR）分批提交并合并，拒绝临尾突击导入，保证全周期代码提交记录真实合规。

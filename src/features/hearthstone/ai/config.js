// AI 建议功能配置（实验性功能，可整体下线）
//
// 密钥、接口地址、模型、每日额度现在全部固定在服务端（server/ai-advisor.js + 环境变量），
// 前端不再配置任何 Key / 地址 / 模型，也不在浏览器保存密钥。
// 下线方式：把 AI_ADVISOR_ENABLED 置为 false（全局按钮即消失），或直接删除 ai/ 目录。

// 总开关：暂不展示炉石 AI 建议入口；保留代码以便后续重新评估时恢复。
export const AI_ADVISOR_ENABLED = false

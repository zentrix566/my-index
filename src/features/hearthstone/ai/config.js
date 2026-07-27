// AI 建议功能配置（实验性功能，可整体下线）
//
// 密钥、接口地址、模型、每日额度现在全部固定在服务端（server/ai-advisor.js + 环境变量），
// 前端不再配置任何 Key / 地址 / 模型，也不在浏览器保存密钥。
// 下线方式：把 AI_ADVISOR_ENABLED 置为 false（全局按钮即消失），或直接删除 ai/ 目录。

// 总开关：是否在全局头部显示「🤖 AI 建议」按钮
export const AI_ADVISOR_ENABLED = true

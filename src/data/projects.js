export const projects = [
  {
    slug: 'aiops-mcp-analyzer',
    category: 'Linux 诊断',
    title: 'AIOps MCP Analyzer',
    summary: '基于 MCP 工具补查、规则分析与 DeepSeek 归因的轻量级 Linux 运维诊断应用。',
    tags: ['AIOps', 'MCP', 'FastAPI', 'DeepSeek'],
    overview: '这个项目把 Linux 运维现场常见的初步排障动作抽象成 MCP 工具，再结合规则分析和 LLM 归因，帮助快速形成可解释的诊断结论。',
    highlights: [
      '通过 MCP 工具补查系统状态，减少一次性收集信息不足的问题。',
      '先用规则做确定性判断，再让 LLM 负责归因表达和处置建议。',
      '适合沉淀为轻量级运维诊断助手，后续可扩展更多工具集。'
    ],
    stack: ['Python', 'FastAPI', 'MCP', 'DeepSeek', 'Linux'],
    links: {
      demos: [
        {
          title: 'AIOps 告警分析演示',
          description: '从 my-aiops 迁移来的智能运维控制台，包含告警筛选、根因分析、MCP 证据和 AI 助手。',
          url: '/aiops'
        }
      ],
      articles: [
        {
          title: '技术文章',
          description: 'AIOps MCP Analyzer 项目介绍与实践记录',
          url: 'https://mp.weixin.qq.com/s/AAoD_hmHpbIEkSw7MwVCXA'
        }
      ],
      repositories: [
        {
          title: 'GitHub 仓库',
          description: '项目源码、部署脚本、API 示例与 MCP 配置说明',
          url: 'https://github.com/zentrix566/my-server-mcp'
        }
      ]
    }
  },
  {
    slug: 'opsagentai',
    category: 'CI/CD 诊断',
    title: 'OpsAgentAI',
    summary: '围绕 Dify、RAG 和飞书机器人的流水线失败日志智能诊断实践。',
    tags: ['DevOps', 'RAG', 'Dify', 'Feishu'],
    overview: '项目聚焦 CI/CD 失败日志的自动化解释，把流水线失败原因、相似案例和修复建议推送到协作工具里。',
    highlights: [
      '把失败日志、历史案例和知识库组织成 RAG 诊断流程。',
      '通过飞书机器人承接通知和交互，贴近日常 DevOps 工作流。',
      '适合继续扩展成多流水线、多知识库的诊断入口。'
    ],
    stack: ['Dify', 'RAG', 'Feishu Bot', 'CI/CD', 'LLM'],
    links: {
      articles: [
        {
          title: '拒绝盲目排查！手把手教你搭建 DevOps 故障 AI 自动诊断助手',
          description: 'OpsAgentAI 技术文章与实践记录',
          url: 'https://mp.weixin.qq.com/s/4CTzMWUdcFEiLnP0YRAEXA'
        }
      ],
      repositories: [
        {
          title: 'OpsAgentAI',
          description: '项目开源代码，欢迎 Star & Fork',
          url: 'https://github.com/zentrix566/OpsAgentAI'
        }
      ]
    }
  },
  {
    slug: 'cicd-architecture',
    category: '发布架构',
    title: 'CI/CD 流水线实践',
    summary: '整理 GitHub Actions、Jenkins 与 Kubernetes 发布模式的 DevOps 实践项目。',
    tags: ['CI/CD', 'Jenkins', 'Kubernetes', 'GitHub Actions'],
    overview: '这个页面用于沉淀发布链路设计、流水线阶段拆分、镜像构建和 Kubernetes 发布策略。',
    highlights: [
      '对比 GitHub Actions 与 Jenkins 在不同场景下的使用方式。',
      '保留容器化和 K8s 发布链路，方便展示工程实践。',
      '后续可以补充灰度发布、回滚和质量门禁。'
    ],
    stack: ['GitHub Actions', 'Jenkins', 'Docker', 'Kubernetes', 'Nginx'],
    links: {
      articles: [
        {
          title: '从 GitHub Action 到飞书机器人回调，构建 DevOps 看板实践',
          description: '统计流水线部署数据，自动生成效能看板推送飞书',
          url: 'https://mp.weixin.qq.com/s/kaD_NAsMxAYP9C_e1ZhtWQ'
        },
        {
          title: '手把手教你用 GitHub Actions 玩转 K8s 四大发布模式',
          description: '滚动/蓝绿/金丝雀/A/B 发布图解与回滚指南',
          url: 'https://mp.weixin.qq.com/s/K9PlPRmVwrdO1XqioTmsNQ'
        },
        {
          title: '从传统部署到云原生：标准与非标准 CI/CD 全场景实战指南',
          description: '单阶段 vs 多阶段构建，标准/非标流程最佳实践',
          url: 'https://mp.weixin.qq.com/s/uRiGNWdht1gbIIyFWiRe5A'
        },
        {
          title: '微服务架构下的 Jenkins 自动化：自定义批量构建插件指南',
          description: 'Jenkins 插件开发，实现多模块联动触发构建',
          url: 'https://mp.weixin.qq.com/s/3CiheVat3XGjRhCE1Mve5Q'
        }
      ],
      repositories: [
        {
          title: 'my-devops-core',
          description: 'DevOps 核心库与流水线模板',
          url: 'https://github.com/zentrix566/my-devops-core'
        },
        {
          title: 'devops',
          description: 'CI/CD 配置示例与实践',
          url: 'https://github.com/zentrix566/devops'
        },
        {
          title: 'test-jenkins-plugin',
          description: 'Jenkins 自定义触发器插件实践',
          url: 'https://github.com/zentrix566/test-jenkins-plugin'
        }
      ]
    }
  }
]

export const findProject = (slug) => projects.find((project) => project.slug === slug)

export const projects = [
  {
    slug: 'edge-compute-lab',
    category: '边缘计算',
    group: '工作项目',
    title: 'EdgeCompute Lab',
    summary: '基于 Terraform、Ansible、K3s 与 Prometheus 的边缘算力节点自动化交付、监控与故障恢复实验平台。',
    tags: ['Terraform', 'Ansible', 'K3s', 'Prometheus', '边缘计算'],
    overview: '模拟企业在多个边缘站点部署计算节点的场景，覆盖从虚拟机创建、系统初始化、集群纳管、应用部署、统一监控到故障恢复的完整生命周期，用于验证边缘节点管理与自动化交付方案。',
    highlights: [
      '使用 Terraform 参数化创建边缘虚拟节点、NAT 网络与磁盘，重复执行保持幂等。',
      '使用 Ansible 完成 Linux 安全基线、SSH 加固、配置漂移检测与 K3s 集群部署。',
      '使用 K3s 构建轻量边缘容器集群，验证节点标签、污点与亲和性调度。',
      '使用 Prometheus / Grafana / Alertmanager 建立主机、容器、存储统一监控与分级告警。',
      '通过节点失联、磁盘容量、Pod 重启等可重复故障演练固化恢复闭环。'
    ],
    stack: ['Terraform', 'KVM/libvirt', 'Ansible', 'K3s', 'Prometheus', 'Grafana', 'Alertmanager'],
    flow: [
      {
        step: 1,
        title: '资源编排',
        tool: 'Terraform + KVM/libvirt',
        desc: '用声明式配置创建三台边缘虚拟节点、NAT 网络与系统盘，支持重复执行且保持幂等。',
        points: ['参数化 CPU、内存、磁盘与 IP', 'cloud-init 注入运维用户与 SSH 公钥', '第二次 plan 无预期变更即幂等']
      },
      {
        step: 2,
        title: '系统初始化',
        tool: 'Ansible',
        desc: '完成 Linux 安全基线、SSH 加固、时间同步、软件源与监控 Agent 部署。',
        points: ['禁止 root 远程登录与密码登录', '配置文件句柄与日志轮转', '安装 node-exporter 采集主机指标']
      },
      {
        step: 3,
        title: '集群纳管',
        tool: 'K3s',
        desc: '自动安装一主两从轻量边缘容器集群，验证节点标签、污点与亲和性调度。',
        points: ['安全传递集群 Token 并自动加入 Worker', '设置 site、compute-type 等节点标签', '为专用计算节点添加污点实现调度隔离']
      },
      {
        step: 4,
        title: '应用部署',
        tool: 'Kubernetes',
        desc: '部署带健康检查与资源限制的示例应用，覆盖滚动发布与中断保护。',
        points: ['startup / readiness / liveness 三类探针', 'CPU/内存 requests 与 limits', 'PodDisruptionBudget 保护可用性']
      },
      {
        step: 5,
        title: '统一监控',
        tool: 'Prometheus / Grafana',
        desc: '建立主机、容器、存储统一监控与分级告警，覆盖常见故障信号。',
        points: ['NodeDown、高 CPU、磁盘容量等告警规则', 'Alertmanager 分级与恢复通知', 'Grafana 主机与集群可视化面板']
      }
    ],
    recovery: {
      title: '故障恢复闭环',
      desc: '通过可重复演练，把"故障 → 发现 → 定位 → 恢复 → 验证"固化成标准运维动作。',
      steps: [
        { title: '故障注入', desc: '停止节点、写满测试盘或部署错误版本，模拟真实异常。' },
        { title: '告警发现', desc: 'Prometheus 触发 Firing，Alertmanager 推送至通知渠道。' },
        { title: '定位诊断', desc: '结合监控指标与 MCP 工具快速定位根因。' },
        { title: '恢复处置', desc: 'Terraform 重建节点 / Ansible 修复漂移 / 回滚错误版本。' },
        { title: '验证闭环', desc: '节点回到 Ready，告警转为 Resolved，演练记录归档。' }
      ]
    },
    links: {}
  },
  {
    slug: 'aiops-mcp-analyzer',
    category: 'Linux 诊断',
    group: '工作项目',
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
    group: '工作项目',
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
    group: '工作项目',
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

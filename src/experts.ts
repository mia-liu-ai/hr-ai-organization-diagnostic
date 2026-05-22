export type ExpertId =
  | 'charan'
  | 'ulrich'
  | 'schein'
  | 'honghu'
  | 'pink'
  | 'sandberg'
  | 'lin'
  | 'classic'
  | 'socio'
  | 'dialogic'
  | 'complexity';

export type ExpertProfile = {
  id: ExpertId;
  name: string;
  school: string;
  origin: string;
  avatar: string;
  accent: string;
  stance: string;
  blindSpot: string;
  evidence: string;
  intervention: string;
  viewpoint: string;
  caseStudy: string;
  takeaway: string;
};

export const experts: ExpertProfile[] = [
  {
    id: 'charan',
    name: '查兰',
    school: '执行力与CEO议程派',
    origin: '全球',
    avatar: '查',
    accent: '#e34b4b',
    stance: '组织问题必须回到业务结果、关键岗位和领导者日程。',
    blindSpot: '把组织发展做成HR活动，而没有进入经营节奏。',
    evidence: '经营复盘、关键岗位盘点和领导者行为样本',
    intervention: '经营议题到组织动作的闭环会',
    viewpoint: '组织不是结构图，而是让战略变成结果的执行系统。',
    caseStudy:
      '在《Execution》中，查兰与拉里·博西迪讨论霍尼韦尔等企业如何把人才、战略和运营复盘绑在一起。',
    takeaway: 'HR要进入经营会议，围绕关键岗位和业务承诺推动组织动作。',
  },
  {
    id: 'ulrich',
    name: '尤里奇',
    school: 'HR转型与三支柱派',
    origin: '美国',
    avatar: '尤',
    accent: '#2f6fed',
    stance: 'HR要从事务支持转向组织能力、人才和领导力的架构师。',
    blindSpot: '只换HR组织架构，没有定义业务价值和服务边界。',
    evidence: '组织能力评估、HR服务旅程和业务伙伴反馈',
    intervention: 'HRBP-COE-SSC协同重构',
    viewpoint: 'HR的成果不是项目数量，而是组织能力是否支撑战略。',
    caseStudy:
      '大型跨国企业的HR共享服务、COE和HRBP实践常被用来解释三支柱如何降低事务摩擦、强化业务伙伴角色。',
    takeaway: '先定义HR服务对象和价值，再决定组织形态与交付机制。',
  },
  {
    id: 'schein',
    name: '沙因',
    school: '组织文化与过程咨询派',
    origin: '美国',
    avatar: '沙',
    accent: '#0f9f9a',
    stance: '文化是组织学会解决问题后沉淀下来的基本假设。',
    blindSpot: '把文化当口号，忽略真实互动、权力关系和心理安全。',
    evidence: '深度访谈、现场观察和关键事件回溯',
    intervention: '文化假设访谈与过程咨询',
    viewpoint: '要改变文化，先看组织在关键时刻如何真的做决定。',
    caseStudy:
      '沙因长期研究DEC等科技组织，强调创始人信念、工程师文化和管理假设会深刻影响组织命运。',
    takeaway: 'HR要帮助管理层看见隐藏假设，而不是只改价值观措辞。',
  },
  {
    id: 'honghu',
    name: '鸿鹄',
    school: '中国组织诊断与业务共创派',
    origin: '中国',
    avatar: '鸿',
    accent: '#e17832',
    stance: '本土组织问题要同时看战略、干部、机制和人情场域。',
    blindSpot: '照搬西方模型，忽略一号位、干部梯队和非正式网络。',
    evidence: '干部访谈、业务战役复盘和关键关系网络',
    intervention: '一号位-干部-HR三方共创会',
    viewpoint: '组织发展要进业务战场，在真实冲突里重塑责任关系。',
    caseStudy:
      '在高速增长企业的区域扩张场景中，常见问题不是流程缺失，而是总部、区域和职能干部的责任边界没有重谈。',
    takeaway: '用业务战役做组织试点，把权责、干部动作和协同规则一次说清。',
  },
  {
    id: 'pink',
    name: '平克',
    school: '动机3.0与知识工作者激励派',
    origin: '美国',
    avatar: '平',
    accent: '#d7438f',
    stance: '复杂工作更依赖自主、精进和意义，而不是单一外部奖励。',
    blindSpot: '用短期奖金解决创造力、敬业度和主动性问题。',
    evidence: '员工动机访谈、工作设计和团队授权实验',
    intervention: '自主权-精进-意义工作设计',
    viewpoint: '激励不是把胡萝卜加大，而是让人重新拥有工作的掌控感。',
    caseStudy:
      'Atlassian 的 ShipIt/FedEx Day 和 Google 20% time 经常被用来说明自主时间如何激发创造性产出。',
    takeaway: '对知识型团队，HR要重设计工作自主权和反馈机制。',
  },
  {
    id: 'sandberg',
    name: '桑德伯格',
    school: '领导力、包容性与高增长组织派',
    origin: '美国',
    avatar: '桑',
    accent: '#9a4be1',
    stance: '高速增长组织需要清晰沟通、直接反馈和更多人能走上领导位置。',
    blindSpot: '只谈绩效增长，不处理包容性、反馈质量和领导机会。',
    evidence: '管理者反馈、人才晋升数据和团队沟通样本',
    intervention: '直接反馈与包容性领导力校准',
    viewpoint: '组织要跑得快，必须让反馈更直接，让机会更可见。',
    caseStudy:
      '桑德伯格在Facebook高速增长期推动运营管理，也通过Lean In倡导女性领导力和同伴支持圈。',
    takeaway: 'HR要把反馈、晋升和包容性纳入同一套领导力系统。',
  },
  {
    id: 'lin',
    name: '林澈',
    school: '中国本土OD与干部管理实践派',
    origin: '中国',
    avatar: '林',
    accent: '#c9485d',
    stance: '先对齐经营目标、权责边界和干部动作。',
    blindSpot: '只做理念宣导，不改业务负责人责任。',
    evidence: '业务复盘、干部访谈和关键项目样本',
    intervention: '干部责任共创会',
    viewpoint: '干部动作变了，组织问题才真的开始变。',
    caseStudy:
      '在事业部协同项目中，常见改善不是先重画架构，而是把关键项目的单一负责人和升级机制明确下来。',
    takeaway: '先让业务负责人共同承诺结果，再谈流程和制度。',
  },
  {
    id: 'classic',
    name: 'Maya Reed',
    school: '经典OD与行动研究派',
    origin: '美国',
    avatar: 'M',
    accent: '#368fce',
    stance: '先诊断、共创干预，再用反馈循环修正。',
    blindSpot: '没有数据和反馈闭环的拍脑袋方案。',
    evidence: '访谈、问卷、行动学习和反馈会议',
    intervention: '诊断反馈工作坊',
    viewpoint: '组织改变不是宣告出来的，是在反馈循环中学出来的。',
    caseStudy:
      '跨部门效率改善项目里，行动研究会先让成员共同看见数据，再由团队共创下一轮实验。',
    takeaway: '把诊断结果交还给组织成员，让他们参与方案设计。',
  },
  {
    id: 'socio',
    name: 'Adrian Novak',
    school: '社会技术系统与组织设计派',
    origin: '欧洲',
    avatar: 'A',
    accent: '#1e9b63',
    stance: '把任务、技术、角色和协作界面一起设计。',
    blindSpot: '把组织问题简化成员工态度问题。',
    evidence: '价值流、工作系统和接口数据',
    intervention: '端到端价值流重设计',
    viewpoint: '协同问题往往不是人不配合，而是工作系统设计错了。',
    caseStudy:
      '制造和服务组织的端到端流程改造常会发现，等待、返工和审批层级比员工意愿更能解释低效。',
    takeaway: '从价值流和接口重新设计角色，而不是只做团队建设。',
  },
  {
    id: 'dialogic',
    name: '许知言',
    school: '对话式OD与组织文化派',
    origin: '跨文化',
    avatar: '许',
    accent: '#c78b21',
    stance: '让组织成员共同看见叙事、关系和安全感。',
    blindSpot: '只改流程却没有处理信任和身份变化。',
    evidence: '焦点小组、故事访谈和关键对话观察',
    intervention: '组织对话场',
    viewpoint: '很多组织冲突背后，是不同群体对同一件事讲着不同故事。',
    caseStudy:
      '文化融合项目中，组织对话场会让双方把担忧、损失感和新身份说出来，再共同定义合作规则。',
    takeaway: '先修复对话质量，再要求组织成员接受新机制。',
  },
  {
    id: 'complexity',
    name: 'Noah Santos',
    school: '复杂性科学与敏捷组织派',
    origin: '全球',
    avatar: 'N',
    accent: '#6d62d8',
    stance: '用小步试验处理复杂问题，放大有效样本。',
    blindSpot: '一次性大方案掩盖真实适应性。',
    evidence: '实验指标、网络协作数据和短周期复盘',
    intervention: '两周组织实验',
    viewpoint: '复杂组织没有银弹，只有更快发现有效样本的机制。',
    caseStudy:
      '敏捷转型试点通常从少数团队开始，用短周期迭代验证节奏、角色和反馈机制，再扩大范围。',
    takeaway: '把大方案拆成小实验，用证据决定是否扩散。',
  },
];

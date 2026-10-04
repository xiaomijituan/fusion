import type { ScenarioQuestion, ScenarioTask } from "./scenario";

export type Lang = "en" | "zh";

export type View = "floor" | "tools" | "playbook" | "library" | "review";

export type AgentKind = "claude" | "codex" | "opencode" | "grok";

export type AgentStatus = "working" | "blocked" | "done" | "idle";

export const kindLabel: Record<AgentKind, string> = {
  claude: "claude",
  codex: "codex",
  opencode: "opencode",
  grok: "grok",
};

export const ui = {
  en: {
    app: "Fusion",
    tag: "the floor",
    slogan: "Millions of points of starlight — fusion.",
    heroKicker: "Multi-agent coding floor",
    heroBrand: "Fusion",
    heroZh: "聚变",
    quoteLead: "Don’t call it Agentic Engineering.",
    quote: "Just call it programming.",
    quoteBy: "DHH, on Lex Fridman — the 12-minute setup",
    enter: "Step onto the floor",
    skip: "Skip intro",
    navFloor: "Floor",
    navTools: "Tools",
    navPlaybook: "Playbook",
    navLibrary: "Library",
    navReview: "Notes",
    libTitle: "Scenario library",
    libLead: "Paste or drop a scenario file. It stays in this browser; nothing is uploaded.",
    libPaste: "Paste scenario JSON…",
    libFile: "Choose a .json file",
    libImport: "Import",
    libStored: "Stored scenarios",
    libShipped: "shipped",
    libUse: "Use",
    libInUse: "In use",
    libDelete: "Delete",
    libEmpty: "Nothing imported yet. The shipped scenario is always here.",
    libOk: "Imported.",
    libWarn: "Imported, with a note:",
    libFail: "Not imported:",
    libBytes: "size",
    agents: "agents",
    hostsLabel: "hosts",
    blocked: "blocked",
    working: "working",
    done: "done",
    idle: "idle",
    jumpBlocked: "Jump to blocked",
    exportRun: "Export run",
    exported: "Saved",
    review: {
      title: "Class notes",
      lead: "One page projected from the event stream: what you were asked, what you chose, what happened next.",
      empty: "No decisions yet — this run has nothing to review.",
      open: "Open a .jsonl",
      current: "Back to this run",
      print: "Print",
      unknown:
        "This stream carries no scenario snapshot, so only ids show. Load the matching scenario, or export a run from this app, and the text fills in.",
      decisions: "decisions",
      ambient: "floor events",
      ticks: "ticks",
      prompt: "Asked",
      choice: "You chose",
      after: "Then",
      kinds: { answer: "answer", dispatch: "dispatch", kill: "kill" },
    },
    noneBlocked: "Nobody is waiting",
    attach: "Attached",
    dispatchPh: "Dispatch a task…",
    dispatch: "Run",
    dispatchHint: "Idle panes pick it up. Enter to run.",
    keys: "j/k select · n next blocked · 1–5 views · ? keys",
    keysTitle: "Keys",
    keysClose: "Close",
    help: [
      ["j / k", "Move between panes"],
      ["n", "Jump to the next blocked agent"],
      ["Enter", "Attach / answer"],
      ["1 2 3 4 5", "Floor, Tools, Playbook, Library, Notes"],
      ["d", "Focus the dispatch bar"],
      ["?", "This list"],
    ],
    fromLex: "After the Lex Fridman interview",
    credit:
      "DHH runs about 16 agent sessions on 4–5 Linux mini PCs. Herdr watches them. Neovim reviews. The machines keep running — you make the calls.",
    answer: "The agent is waiting on you",
    killed: "Pane killed. Idle.",
    continued: "Noted. Continuing.",
    copied: "Copied",
    copy: "Copy",
    seeFloor: "See it on the floor",
    status: {
      working: "working",
      blocked: "blocked",
      done: "done",
      idle: "idle",
    } as Record<AgentStatus, string>,
    emptyTerm: "Idle pane. Dispatch a task, or wait — something will land.",
    adhocProject: "ad-hoc",
    doneTerm: "Done. Review in Neovim, or dispatch the next one.",
    machine: "machine",
    pane: "pane",
    project: "project",
    kind: "agent",
    toolsKicker: "The stack",
    toolsTitle: "Every tool on the floor",
    toolsLead:
      "Not a shopping list. The order DHH actually uses: a multiplexer that can see agents, a private network, hardware hands, and an editor that stopped being for writing.",
    playKicker: "The shift",
    playTitle: "You stop typing the code",
    playLead:
      "The job is dispatch, interrupt, and taste. The machines keep working when the lid closes.",
    footer: "Inspired by DHH on Lex Fridman. Not affiliated with 37signals, Herdr, or Omarchy.",
  },
  zh: {
    app: "聚变 Fusion",
    tag: "机房",
    slogan: "千万亿点星光——聚变。",
    heroKicker: "多 agent 编码机房",
    heroBrand: "Fusion",
    heroZh: "聚变",
    quoteLead: "别再叫 Agentic Engineering 了。",
    quote: "就叫编程。",
    quoteBy: "DHH，Lex Fridman 访谈 — 那 12 分钟的设置",
    enter: "进入机房",
    skip: "跳过介绍",
    navFloor: "机房",
    navTools: "工具",
    navPlaybook: "流程",
    navLibrary: "剧本库",
    navReview: "课后笔记",
    libTitle: "剧本库",
    libLead: "粘贴或拖入剧本文件。它只留在你这台浏览器的本地，不会上传。",
    libPaste: "粘贴剧本 JSON…",
    libFile: "选一个 .json 文件",
    libImport: "导入",
    libStored: "已存剧本",
    libShipped: "出厂",
    libUse: "使用",
    libInUse: "使用中",
    libDelete: "删除",
    libEmpty: "还没有导入过剧本。出厂剧本一直在这儿。",
    libOk: "已导入。",
    libWarn: "导入成功，但有提醒：",
    libFail: "未导入：",
    libBytes: "大小",
    agents: "个 agent",
    hostsLabel: "台机器",
    blocked: "等待你",
    working: "工作中",
    done: "完成",
    idle: "空闲",
    jumpBlocked: "跳到等待中",
    exportRun: "导出这一局",
    exported: "已导出",
    review: {
      title: "课后笔记",
      lead: "从事件流排出一页复盘：当时被问到什么、你选了什么、之后发生了什么。",
      empty: "这一局还没有决策，没什么可复盘。",
      open: "打开 .jsonl",
      current: "回到这一局",
      print: "打印",
      unknown:
        "这份事件流没带剧本快照，所以只显示 id。载入对应剧本、或用本机导出一份，文案就会补上。",
      decisions: "决策",
      ambient: "环境事件",
      ticks: "拍",
      prompt: "被问到",
      choice: "你选了",
      after: "之后",
      kinds: { answer: "拍板", dispatch: "下发", kill: "关掉" },
    },
    noneBlocked: "没有人在等",
    attach: "已附着",
    dispatchPh: "下发一个任务…",
    dispatch: "跑",
    dispatchHint: "空闲 pane 会接住。回车即跑。",
    keys: "j/k 选择 · n 下一个等待 · 1–5 视图 · ? 快捷键",
    keysTitle: "快捷键",
    keysClose: "关闭",
    help: [
      ["j / k", "在 pane 之间移动"],
      ["n", "跳到下一个等待你的 agent"],
      ["Enter", "附着 / 回答"],
      ["1 2 3 4 5", "机房、工具、流程、剧本库、课后笔记"],
      ["d", "聚焦下发栏"],
      ["?", "打开这张表"],
    ],
    fromLex: "来自 Lex Fridman 访谈之后",
    credit:
      "DHH 在 4–5 台 Linux mini PC 上同时跑大约 16 个 agent。Herdr 盯着它们。Neovim 负责 review。机器一直在跑，你负责拍板。",
    answer: "这个 agent 在等你拍板",
    killed: "Pane 已关掉。空闲。",
    continued: "记下了。继续。",
    copied: "已复制",
    copy: "复制",
    seeFloor: "在机房里看",
    status: {
      working: "工作中",
      blocked: "等待你",
      done: "完成",
      idle: "空闲",
    } as Record<AgentStatus, string>,
    emptyTerm: "空闲 pane。下发一个任务，或者等 — 会有活来。",
    adhocProject: "临时任务",
    doneTerm: "完成。去 Neovim 里 review，或下发下一件。",
    machine: "机器",
    pane: "pane",
    project: "项目",
    kind: "agent",
    toolsKicker: "这一套",
    toolsTitle: "机房里的每一样工具",
    toolsLead:
      "不是购物清单。按 DHH 实际使用的顺序：能看见 agent 的多路复用器、一张私有网、一双硬件的手，以及一个不再用来写代码的编辑器。",
    playKicker: "转变",
    playTitle: "你不再敲那行代码",
    playLead: "工作变成下发、打断、和品味。盖上盖子，机器还在跑。",
    footer: "受 DHH 在 Lex Fridman 访谈启发。与 37signals、Herdr、Omarchy 无关。",
  },
} as const;

export type ToolId = "tmux" | "herdr" | "tailscale" | "comet" | "neovim";

export const tools: {
  id: ToolId;
  name: string;
  href: string;
  en: {
    one: string;
    what: string;
    why: string;
    how: string;
    cmds: { label: string; cmd: string }[];
  };
  zh: {
    one: string;
    what: string;
    why: string;
    how: string;
    cmds: { label: string; cmd: string }[];
  };
}[] = [
  {
    id: "tmux",
    name: "tmux",
    href: "https://github.com/tmux/tmux/wiki",
    en: {
      one: "The old floor. Sessions that survive a closed terminal.",
      what: "A terminal multiplexer. One window holds many sessions, windows, and panes. Detach, close the laptop, attach later — the processes never noticed.",
      why: "This is where DHH started: several agents and Neovim in one terminal. He moved on because tmux cannot see whether an agent is working, blocked, or done. You still need it in your hands — it teaches the feeling of parallel, durable sessions.",
      how: "Install it, make a named session, split panes, detach with the prefix. Live there for a week before you graduate.",
      cmds: [
        { label: "macOS", cmd: "brew install tmux" },
        { label: "Debian", cmd: "sudo apt install tmux" },
        { label: "New session", cmd: "tmux new -s work" },
        { label: "Split", cmd: 'Ctrl-b %   ·   Ctrl-b "' },
        { label: "Detach", cmd: "Ctrl-b d" },
        { label: "Attach", cmd: "tmux attach -t work" },
      ],
    },
    zh: {
      one: "旧机房。关掉终端，会话还在。",
      what: "终端多路复用器。一个窗口里放多个 session、window、pane。分离、合上笔记本、再附着 — 进程根本没发现。",
      why: "DHH 从这里起步：一个终端里同时开几个 agent 和 Neovim。后来离开，是因为 tmux 看不见 agent 是在干活、卡住、还是做完了。你还是得会用 — 它先教会你「并行、而且不会丢」的手感。",
      how: "装上，开一个有名字的 session，切分 pane，用 prefix 分离。先在这里住一周，再毕业。",
      cmds: [
        { label: "macOS", cmd: "brew install tmux" },
        { label: "Debian", cmd: "sudo apt install tmux" },
        { label: "新会话", cmd: "tmux new -s work" },
        { label: "切分", cmd: 'Ctrl-b %   ·   Ctrl-b "' },
        { label: "分离", cmd: "Ctrl-b d" },
        { label: "附着", cmd: "tmux attach -t work" },
      ],
    },
  },
  {
    id: "herdr",
    name: "Herdr",
    href: "https://herdr.dev/",
    en: {
      one: "tmux, if tmux could tell you who is waiting.",
      what: "A terminal runtime built for coding agents. Real PTYs, always on, with a sidebar that marks each pane working, blocked, done, or idle. Jump to the one that needs a human instead of hunting.",
      why: "This is the floor. DHH runs about 16 sessions across 4–5 machines inside it. Agents keep going when the lid closes or SSH drops. Herdr does not replace Claude, Codex, OpenCode, or Grok — it owns their terminals.",
      how: "Install the single binary, launch it, start your agents in panes. Use herdr --remote user@host over Tailscale to sit on another box.",
      cmds: [
        { label: "Install", cmd: "curl -fsSL https://herdr.dev/install.sh | sh" },
        { label: "Or brew", cmd: "brew install herdr" },
        { label: "Launch", cmd: "herdr" },
        { label: "Detach", cmd: "Ctrl-b q" },
        { label: "Remote", cmd: "herdr --remote user@omarchy-1" },
      ],
    },
    zh: {
      one: "如果 tmux 能告诉你谁在等你。",
      what: "为 coding agent 做的终端运行时。真正的 PTY，一直开着，侧边栏标出每个 pane：工作中、等待你、完成、空闲。跳到需要人的那个，而不是挨个翻。",
      why: "这就是机房。DHH 在里面、跨 4–5 台机器跑大约 16 个 session。合盖、SSH 掉线，agent 还在跑。Herdr 不替换 Claude、Codex、OpenCode、Grok — 它拥有它们的终端。",
      how: "装上那一个二进制，启动，在 pane 里跑你的 agent。经 Tailscale 用 herdr --remote user@host 坐到另一台机器上。",
      cmds: [
        { label: "安装", cmd: "curl -fsSL https://herdr.dev/install.sh | sh" },
        { label: "或 brew", cmd: "brew install herdr" },
        { label: "启动", cmd: "herdr" },
        { label: "分离", cmd: "Ctrl-b q" },
        { label: "远程", cmd: "herdr --remote user@omarchy-1" },
      ],
    },
  },
  {
    id: "tailscale",
    name: "Tailscale",
    href: "https://tailscale.com",
    en: {
      one: "A private network with names, not port forwards.",
      what: "A WireGuard mesh. Laptops, mini PCs, phones, and KVMs join one tailnet and reach each other as omarchy-1 or 100.x.x.x. No public IP. No router theatre.",
      why: "The floor is several boxes, not one. Tailscale is how Herdr --remote feels local, and how the Comet KVM is reachable from a train.",
      how: "One account, install on every machine, log in. Then ssh user@omarchy-1. The free personal plan is enough.",
      cmds: [
        { label: "Install", cmd: "curl -fsSL https://tailscale.com/install.sh | sh" },
        { label: "Up", cmd: "sudo tailscale up" },
        { label: "SSH", cmd: "ssh user@omarchy-1" },
        { label: "Status", cmd: "tailscale status" },
      ],
    },
    zh: {
      one: "一张有名字的私有网，而不是端口转发。",
      what: "基于 WireGuard 的 mesh。笔记本、mini PC、手机、KVM 加入同一个 tailnet，用 omarchy-1 或 100.x.x.x 互相访问。没有公网 IP，也没有路由器表演。",
      why: "机房是好几台机器，不是一台。Tailscale 让 herdr --remote 像在本地，也让火车上能打开 Comet KVM。",
      how: "一个账号，每台机器装上并登录。然后 ssh user@omarchy-1。个人免费版够用。",
      cmds: [
        { label: "安装", cmd: "curl -fsSL https://tailscale.com/install.sh | sh" },
        { label: "上线", cmd: "sudo tailscale up" },
        { label: "SSH", cmd: "ssh user@omarchy-1" },
        { label: "状态", cmd: "tailscale status" },
      ],
    },
  },
  {
    id: "comet",
    name: "Comet KVM",
    href: "https://www.gl-inet.com/",
    en: {
      one: "Hands on the metal when SSH is not enough.",
      what: "A GL.iNet KVM-over-IP box (Comet / GL-RM1). HDMI out, USB keyboard and mouse in. BIOS, boot, and a machine that has no network — from a browser, at 4K30.",
      why: "The mini PCs live in a closet. When one will not boot, Herdr cannot help. A Comet on each box, on the tailnet, is sitting in front of it.",
      how: "HDMI to the machine, USB to the machine, ethernet to the LAN, power. Open glkvm.local, then put Tailscale on it so the closet is not a place you have to walk to.",
      cmds: [
        { label: "Local UI", cmd: "https://glkvm.local" },
        { label: "Then", cmd: "tailscale up   # on the Comet" },
        { label: "Open", cmd: "https://comet-a   # MagicDNS" },
      ],
    },
    zh: {
      one: "SSH 不够时，把手放回金属上。",
      what: "GL.iNet 的 KVM-over-IP（Comet / GL-RM1）。接 HDMI 输出、USB 键鼠。BIOS、开机、以及一台没有网的机器 — 浏览器里，4K30。",
      why: "mini PC 住在柜子里。有一台起不来时，Herdr 帮不上。每台配一个 Comet，挂在 tailnet 上，就等于坐在它前面。",
      how: "HDMI 接机器，USB 接机器，网线接局域网，插电。打开 glkvm.local，再给它装 Tailscale，柜子就不必走过去。",
      cmds: [
        { label: "本地界面", cmd: "https://glkvm.local" },
        { label: "然后", cmd: "tailscale up   # 在 Comet 上" },
        { label: "打开", cmd: "https://comet-a   # MagicDNS" },
      ],
    },
  },
  {
    id: "neovim",
    name: "Neovim",
    href: "https://neovim.io/",
    en: {
      one: "Still open. No longer where the code is written.",
      what: "A modal editor. Tiny, keyboard-first, with a plugin culture that can look like an IDE if you want it to.",
      why: "DHH still lives in it — to walk a tree, to read context, to review what an agent just did. lazygit, gitsigns, telescope. The agents write. The human looks.",
      how: "Install Neovim. Start from LazyVim if you want the IDE overnight. Put it in a middle pane; agents on either side. You are not the bottleneck of keystrokes anymore. You are the bottleneck of decisions.",
      cmds: [
        { label: "macOS", cmd: "brew install neovim" },
        { label: "Open", cmd: "nvim" },
        { label: "LazyVim", cmd: "git clone https://github.com/LazyVim/starter ~/.config/nvim" },
        { label: "Review", cmd: ":LazyGit   ·   :Gitsigns blame" },
      ],
    },
    zh: {
      one: "还开着。但代码不再在这里写。",
      what: "模态编辑器。极轻、键盘优先，插件文化能把它变成 IDE，如果你想的话。",
      why: "DHH 还住在里面 — 逛目录、看上下文、review agent 刚做的事。lazygit、gitsigns、telescope。agent 写。人看。",
      how: "装 Neovim。想一夜变成 IDE 就从 LazyVim 开始。放在中间 pane，两边是 agent。你不再是击键的瓶颈，你是决策的瓶颈。",
      cmds: [
        { label: "macOS", cmd: "brew install neovim" },
        { label: "打开", cmd: "nvim" },
        { label: "LazyVim", cmd: "git clone https://github.com/LazyVim/starter ~/.config/nvim" },
        { label: "Review", cmd: ":LazyGit   ·   :Gitsigns blame" },
      ],
    },
  },
];

export const playbook = {
  en: [
    {
      n: "01",
      title: "Dispatch",
      body: "You write the task, not the implementation. A sentence in the pane is the new blank file. Be specific about the repo, the constraint, and what “done” looks like.",
    },
    {
      n: "02",
      title: "Leave them running",
      body: "Herdr holds real terminals. Close the lid, drop SSH, walk away. Sixteen sessions on five boxes is only useful if they outlive your attention.",
    },
    {
      n: "03",
      title: "Interrupt, don’t poll",
      body: "The sidebar tells you who is blocked. Jump there. Answer the one question. That is the whole human loop — not watching logs scroll.",
    },
    {
      n: "04",
      title: "Review in Neovim",
      body: "Read the diff. Taste is the job. Merge, redirect, or kill. Then dispatch the next one. Don’t call it Agentic Engineering. Just call it programming.",
    },
  ],
  zh: [
    {
      n: "01",
      title: "下发",
      body: "你写任务，不写实现。pane 里的一句话，就是新的空白文件。把仓库、约束、和「怎样算完」说清楚。",
    },
    {
      n: "02",
      title: "让它们继续跑",
      body: "Herdr 握着真正的终端。合盖、SSH 掉、走开。五台机器上十六个 session，只有在你不看的时候还活着，才有意义。",
    },
    {
      n: "03",
      title: "打断，而不是轮询",
      body: "侧边栏告诉你谁卡住了。跳过去。回答那一个问题。这就是全部的人环 — 不是盯着日志滚。",
    },
    {
      n: "04",
      title: "在 Neovim 里 review",
      body: "看 diff。品味才是工作。合并、改道、或关掉。然后下发下一件。别再叫 Agentic Engineering。就叫编程。",
    },
  ],
};

export const genericQuestion: ScenarioQuestion = {
  text: {
    zh: "这句任务之外没有更多规格。按你的理解继续做，还是停下来把目标重述一遍？",
    en: "That task has no spec beyond the sentence you wrote. Keep going on your reading of it, or stop and restate the goal?",
  },
  options: [
    { id: "keep", label: { zh: "按你的理解继续", en: "Keep going" } },
    { id: "restate", label: { zh: "重述目标再动手", en: "Restate the goal" } },
    { id: "kill", label: { zh: "关掉这个 pane", en: "Close the pane" } },
  ],
};

export const customLines: ScenarioTask["lines"] = {
  zh: ["打开仓库", "起草改动", "跑测试", "等你看一眼"],
  en: ["Opening the repo", "Drafting the change", "Running tests", "Waiting on a glance"],
};

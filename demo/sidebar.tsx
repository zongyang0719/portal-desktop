import { moveChatSessions } from "../desktop/shared/chat-session-order";
import type { ChatSessionOperation } from "../desktop/shared/types";
import { useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ChatActivity } from "../desktop/renderer/chat/components/messages";
import { ChatSceneStatus } from "../desktop/renderer/app/components/chat-scene-status";
import type { Run } from "../desktop/renderer/chat/models/chat";
import { ChatSceneIndicator } from "../desktop/renderer/app/components/chat-scene";
import type { ChatScene, ChatSceneActivity } from "../desktop/shared/types";
import { CHAT_SCENE_ACTIVITY_LABELS } from "../desktop/shared/types";
import type { HistoryScope } from "../desktop/renderer/chat/models/scenes";
import "../desktop/renderer/app/styles.css";
import "./sidebar-demo.css";
type Fixture = "default" | "statuses" | "long" | "empty" | "disconnected";
const sampleNames: Record<ChatSceneActivity, string> = {
  queued: "整理这周的想法", thinking: "把工作空间留白", replying: "读到一半的书", working: "找一张合适的参考",
  waiting: "周末去哪里走走", done: "窗边的一束光", error: "同步旅行笔记", stopped: "一些暂时放下的计划",
};
const allStatuses = Object.entries(CHAT_SCENE_ACTIVITY_LABELS) as [ChatSceneActivity, string][];

function makeScene(id: string, label: string): ChatScene {
  return { scene_id: id, scene_meta: { client: "web-demo", scene_label: label } };
}

function fixtures(mode: Fixture): ChatScene[] {
  if (mode === "empty") return [];
  if (mode === "statuses") return [makeScene("demo-idle", "今天，慢慢来"),
    ...allStatuses.map(([status]) => makeScene(`demo-status-${status}`, sampleNames[status]))];
  const scenes = [
    makeScene("demo-latest", "今天，慢慢来"),
    makeScene("demo-design", "一个安静的工作空间"),
    makeScene("demo-reading", "读到一半的书"),
    makeScene("demo-weekend", "周末去哪里走走"),
    makeScene("demo-long-title", "关于窗边那束光，以及一个很长很长还没有说完的故事"),
  ];
  return mode === "long"
    ? scenes.concat(Array.from({ length: 35 }, (_, index) =>
        makeScene(`demo-extra-${index}`, `场景记录 ${index + 1} · 留给下一次的想法`)))
    : scenes;
}

const activity: Record<string, ChatSceneActivity> = {
  ...Object.fromEntries(allStatuses.map(([status]) => [`demo-status-${status}`, status])),
  "demo-design": "working",
  "demo-reading": "done",
  "demo-weekend": "waiting",
};

function SidebarDemo() {
  const [fixture, setFixture] = useState<Fixture>("statuses");
  const [sessions, setSessions] = useState(() => fixtures("statuses"));
  const [selectedId, setSelectedId] = useState("demo-status-thinking");
  const [scope, setScope] = useState<HistoryScope>("current");
  const [theme, setTheme] = useState(() =>
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState("");
  const [platform, setPlatform] = useState("web");
  const [inspector, setInspector] = useState(false);
  const [failMove, setFailMove] = useState(false);
  const scene = sessions.find(item => item.scene_id === selectedId);
  const connected = fixture !== "disconnected";
  const status = activity[selectedId];
  const run = status && status !== "queued" ? {
    kind: "run", id: `preview-${selectedId}`, start: Date.now() - 12000,
    ...(status === "done" || status === "error" || status === "stopped" ? { end: Date.now(), outcome: status } : {}),
    waitingForReply: status === "waiting", label: CHAT_SCENE_ACTIVITY_LABELS[status], hint: "", arg: "",
    entries: [{ type: status === "working" ? "tool" : "think", name: status === "working" ? "查找参考" : undefined,
      text: "先整理你的想法，再把值得保留的细节放在一起。", done: ["done", "error", "stopped"].includes(status) }],
  } satisfies Run : undefined;

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.body.dataset.view = "chat";
    document.documentElement.dataset.platform = platform;
  }, [theme, platform]);

  const reset = (mode: Fixture) => {
    const next = fixtures(mode);
    setFixture(mode);
    setSessions(next);
    setSelectedId(next[0]?.scene_id ?? "");
    setScope("current");
    setNotice("");
    setRevision(value => value + 1);
  };

  const changeSession = async (
    operation: ChatSessionOperation,
    value: string | string[],
    sceneId?: string,
  ) => {
    if (!connected) throw new Error("请先切换到已连接的预览数据。");
    if (failMove && ["move", "rename", "delete"].includes(operation)) throw new Error("模拟：保存失败，请关闭失败模拟后重试。");
    if (operation === "move") {
      setSessions(items => moveChatSessions(items, Array.isArray(value) ? value : [value], sceneId));
    } else if (operation === "delete") {
      const ids = Array.isArray(value) ? value : [value];
      const activeIndex = sessions.findIndex(item => item.scene_id === selectedId);
      const neighbor = sessions.slice(activeIndex + 1).find(item => !ids.includes(item.scene_id))
        ?? sessions.slice(0, activeIndex).reverse().find(item => !ids.includes(item.scene_id));
      let next = sessions.filter(item => !ids.includes(item.scene_id));
      if (!next.length) next = [makeScene(`demo-${crypto.randomUUID()}`, "新场景")];
      setSessions(next);
      if (ids.includes(selectedId)) setSelectedId(neighbor?.scene_id ?? next[0].scene_id);
    } else if (typeof value !== "string") {
      throw new Error("无效的场景参数。");
    } else if (operation === "select") {
      setSelectedId(value);
    } else if (operation === "create" || operation === "bind") {
      const id = operation === "bind" ? sceneId : `demo-${crypto.randomUUID()}`;
      if (!id) throw new Error("请填写场景 ID。");
      setSessions(items => items.some(item => item.scene_id === id)
        ? items : [...items, makeScene(id, value)]);
      setSelectedId(id);
    } else if (operation === "rename") {
      setSessions(items => items.map(item => item.scene_id === sceneId
        ? { ...item, scene_meta: { ...item.scene_meta, scene_label: value } } : item));
    }
    setNotice("");
  };

  return <>
    <div className="demo-toolbar" role="region" aria-label="预览设置">
      <strong>Sidebar <span>预览</span></strong>
      <label>数据
        <select aria-label="预览数据" value={fixture} onChange={event => reset(event.target.value as Fixture)}>
          <option value="statuses">全部 8 种状态</option>
          <option value="default">日常场景</option>
          <option value="long">长列表</option>
          <option value="empty">空列表</option>
          <option value="disconnected">未连接</option>
        </select>
      </label>
      <label>外观
        <select aria-label="外观" value={theme} onChange={event => setTheme(event.target.value)}>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </label>
      <label>窗口
        <select aria-label="窗口示意" value={platform} onChange={event => setPlatform(event.target.value)}>
          <option value="web">Web</option>
          <option value="darwin">macOS 示意</option>
          <option value="win32">Windows 示意</option>
        </select>
      </label>
      <label><input type="checkbox" checked={inspector} onChange={event => setInspector(event.target.checked)} />右侧面板</label>
      <label><input type="checkbox" checked={failMove} onChange={event => setFailMove(event.target.checked)} />保存失败模拟</label>
      <button type="button" onClick={() => reset(fixture)}>重置预览</button>
      <span className="demo-local-note">数据刷新重置 · 宽度本机记忆</span>
    </div>
    <main id="client-main">
        <div className="workspace-body">
          {platform === "win32" && <span className="demo-window-buttons" aria-hidden="true"><i>−</i><i>□</i><i>×</i></span>}
        <div className="workspace-stage">
          <header className="topbar">
            {platform === "darwin" && <span className="demo-traffic-lights" aria-hidden="true"><i /><i /><i /></span>}
            <ChatSceneIndicator widthPreferenceKey="portal.demo.sceneSidebarWidth" key={revision} scene={scene} sessions={sessions}
              activity={activity} connected={connected} scope={scope} scopeReady={connected}
              onScope={setScope} onSession={changeSession}
              onCopy={id => {
                void navigator.clipboard?.writeText(id).then(
                  () => setNotice("场景 ID 已复制"),
                  () => setNotice(`场景 ID：${id}`),
                );
                if (!navigator.clipboard) setNotice(`场景 ID：${id}`);
              }} />
            <div className="pair-name"><span className="pair-human">你</span><span>与</span><span>Being</span></div>
            <div className="topbar-actions"><span className="demo-connection">{connected ? "本地预览" : "未连接"}</span></div>
          </header>
          <section id="chat-view" className="view demo-conversation" aria-label="模拟对话">
            <div className="demo-reading">
              <p className="demo-eyebrow">{scope === "all" ? "全部场景上下文" : "当前场景"}</p>
              <h1>{scene?.scene_meta.scene_label ?? "还没有场景"}</h1>
              <p className="demo-message demo-message-human">想留一点空间，给今天的想法。</p>
              <p className="demo-message">{status === "queued" ? "这条消息正在等待前面的任务完成。" :
                status === "working" ? "我去找几份参考，看看它们怎样处理留白和层级。" :
                status === "thinking" ? "让我想想，哪些东西值得留下。" :
                status === "waiting" ? "后台任务已完成，正在等待 Being 的回复。" :
                "好，我们慢慢说。从你最想聊的那件事开始。"}</p>
              {status === "queued" && <p className="demo-queued"><ChatSceneStatus status="queued" id="demo-queued-status" />排队中</p>}
              {run && <ChatActivity key={run.id} run={run} canStop={false} stopping={false} runtime={{ stopCurrentTurn: async () => {} }} />}
            </div>
            <p className="demo-footnote">模拟数据 · 侧栏与过程摘要复用正式组件。点击不同场景可核对状态；右侧面板仅为示意。{platform !== "web" && " 窗口按钮仅为示意。"}</p>
          </section>
        </div>
        {inspector && <aside className="demo-inspector" aria-label="右侧辅助面板">
          <header>场景信息</header>
          <div><p className="demo-eyebrow">当前场景</p><p>{scene?.scene_meta.scene_label ?? "还没有场景"}</p>
            <p className="demo-eyebrow">上下文</p><p>{scope === "all" ? "全部场景" : "仅当前场景"}</p></div>
        </aside>}
      </div>
    </main>
    <p className="demo-notice" role="status" hidden={!notice}>{notice}</p>
  </>;
}

createRoot(document.getElementById("root")!).render(<SidebarDemo />);

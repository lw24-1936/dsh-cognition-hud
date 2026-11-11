window.__ModuleLoader__.load({
  id: '@local/dsh-cognition-hud',
  factory(require) {
    'use strict';
    const React = require('react');
    const h = React.createElement;

    /* ------------------------------------------------------------------ *
     * Copy
     * ------------------------------------------------------------------ */
    const EN = {
      title: 'Cognition HUD',
      thinking: 'Thinking',
      acting: 'Calling tools',
      answering: 'Answering',
      waiting: 'Waiting for the model',
      idle: 'Idle',
      done: 'Step finished',
      thought: 'Thought stream',
      tools: 'Tool intents',
      steps: 'Recent steps',
      noStream: 'No reasoning text from this model. Activity only.',
      unbound: 'Waiting for a conversation',
      unboundHint: 'Open a session: the HUD binds when the conversation view retains it.',
      hideThoughts: 'Hide reasoning text',
      showThoughts: 'Show reasoning text',
      collapse: 'Collapse cognition HUD',
      expand: 'Expand cognition HUD',
      out: 'out',
      reasoningTokens: 'reasoning',
      rate: 'chars/s',
      chars: 'chars',
      step: 'step',
      turn: 'turn',
      hidden: 'earlier chars folded',
      error: 'Last error',
      bound: 'bound',
      frames: 'frames',
      events: 'events',
      diag: 'Diagnostics',
      ctx: 'ctx',
      legendReasoning: 'reasoning',
      legendText: 'answer',
      legendTool: 'tools',
      orbHint: 'Drag to move · click to expand · right-click for menu',
      menuExpand: 'Expand panel',
      menuCollapse: 'Collapse to orb',
      menuHideThoughts: 'Hide reasoning text',
      menuShowThoughts: 'Show reasoning text',
      menuReset: 'Reset orb position',
      menuPetShow: 'Show the whale',
      menuPetHide: 'Hide the whale',
      menuCalm: 'Animation: calm',
      menuSmooth: 'Animation: smooth',
      menuClose: 'Close HUD (returns on reload)',
      capPlugins: 'Plugins',
      capSkills: 'Skills',
      capMcp: 'MCP',
      capPluginsHint: 'Tool calls grouped by the plugin that provides them (name-based approximation).',
    };
    const ZH = {
      title: '认知监视',
      thinking: '思考中',
      acting: '调用工具',
      answering: '回答中',
      waiting: '等待模型',
      idle: '空闲',
      done: '本步完成',
      thought: '思考流',
      tools: '工具意图',
      steps: '最近步骤',
      noStream: '该模型未输出思考文本，仅显示活动。',
      unbound: '等待会话',
      unboundHint: '打开一个会话说：对话视图持有它之后才会开始接收实时思考。',
      hideThoughts: '隐藏思考原文',
      showThoughts: '显示思考原文',
      collapse: '收起认知监视',
      expand: '展开认知监视',
      out: '输出',
      reasoningTokens: '推理',
      rate: '字/秒',
      chars: '字',
      step: '步',
      turn: '轮',
      hidden: '字已折叠',
      error: '最近错误',
      bound: '已绑定',
      frames: '帧',
      events: '事件',
      diag: '诊断',
      ctx: '上下文',
      legendReasoning: '推理',
      legendText: '回答',
      legendTool: '工具',
      orbHint: '拖动移动 · 单击展开 · 右键菜单',
      menuExpand: '展开面板',
      menuCollapse: '收起为小球',
      menuHideThoughts: '隐藏思考原文',
      menuShowThoughts: '显示思考原文',
      menuReset: '重置小球位置',
      menuPetShow: '显示小鲸鱼',
      menuPetHide: '隐藏小鲸鱼',
      menuCalm: '动画：省电',
      menuSmooth: '动画：流畅',
      menuClose: '关闭监视（刷新后恢复）',
      capPlugins: '插件',
      capSkills: '技能',
      capMcp: 'MCP',
      capPluginsHint: '按工具名归到提供它的插件（近似映射，悬停可看原始工具名）。',
    };
    let t = key => EN[key] || key;

    /* ------------------------------------------------------------------ *
     * Store
     * ------------------------------------------------------------------ */
    const CAP = { reasoning: 16000, text: 3000, args: 700 };
    const VIEW = 4200;
    const MAX_ATTEMPTS = 8;
    const listeners = new Set();
    const PREFS_KEY = 'dsh-cognition-hud:prefs';
    const prefs = { open: true, showThoughts: false, pos: null, hidden: false, pet: true, calm: false };
    try {
      const saved = window.localStorage.getItem(PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.open === 'boolean') prefs.open = parsed.open;
          if (typeof parsed.showThoughts === 'boolean') prefs.showThoughts = parsed.showThoughts;
          if (parsed.pos && typeof parsed.pos.x === 'number' && typeof parsed.pos.y === 'number') prefs.pos = parsed.pos;
          if (typeof parsed.pet === 'boolean') prefs.pet = parsed.pet;
          if (typeof parsed.calm === 'boolean') prefs.calm = parsed.calm;
        }
      }
    } catch (error) {
      /* storage is optional */
    }

    function savePrefs() {
      try {
        window.localStorage.setItem(
          PREFS_KEY,
          JSON.stringify({
            open: prefs.open,
            showThoughts: prefs.showThoughts,
            pos: prefs.pos,
            pet: prefs.pet,
            calm: prefs.calm,
          }),
        );
      } catch (error) {
        /* storage is optional */
      }
    }

    function newAttempt(id, turn, step) {
      return {
        id: id,
        turn: turn,
        step: step,
        reasoning: '',
        text: '',
        tools: [],
        tokens: { input: 0, output: 0, reasoning: 0, cache: 0 },
        startedAt: Date.now(),
        endedAt: 0,
        finish: null,
      };
    }

    let state = {
      sessionId: null,
      bound: false,
      running: false,
      phase: 'idle',
      attempts: [],
      chars: 0,
      samples: [],
      lastAt: 0,
      error: null,
      diag: { frames: 0, events: 0, lastKind: 'none', bindTries: 0 },
    };

    function currentAttempt() {
      return state.attempts.length ? state.attempts[state.attempts.length - 1] : null;
    }

    function ensureAttempt(id, turn, step) {
      const cur = currentAttempt();
      if (cur && cur.id === id) {
        cur.turn = turn;
        cur.step = step;
        return cur;
      }
      if (cur && cur.id === 'history' && !cur.reasoning && !cur.text && !cur.tools.length) {
        state.attempts.pop();
      }
      const next = newAttempt(id, turn, step);
      state.attempts.push(next);
      if (state.attempts.length > MAX_ATTEMPTS) {
        state.attempts.splice(0, state.attempts.length - MAX_ATTEMPTS);
      }
      state.phase = 'thinking';
      return next;
    }

    function rateOf(samples) {
      const now = Date.now();
      const recent = samples.filter(sample => now - sample.t <= 2500);
      if (recent.length < 2) return 0;
      const first = recent[0];
      const last = recent[recent.length - 1];
      const seconds = Math.max(0.25, (last.t - first.t) / 1000);
      return Math.max(0, Math.round((last.n - first.n) / seconds));
    }

    function sparkOf(samples) {
      const points = [];
      for (let index = 1; index < samples.length; index += 1) {
        const delta = samples[index].n - samples[index - 1].n;
        points.push(delta > 0 ? delta : 0);
      }
      return points.slice(-48);
    }

    function toolSignature(attempt) {
      if (!attempt) return '';
      return attempt.tools
        .map(tool => tool.id + ':' + tool.name + ':' + (tool.done ? 1 : 0) + ':' + tool.args.length)
        .join('|');
    }

    function stepSignature(attempts) {
      return attempts
        .map(attempt => attempt.id + ':' + attempt.reasoning.length + ':' + attempt.text.length + ':' + attempt.tools.length + ':' + attempt.endedAt)
        .join('|');
    }

    const PLUGIN_GROUPS = [
      [/^(read|write|edit|multi_edit|apply_patch|read_image)$/, 'fs'],
      [/^(glob|grep)$/, 'fs'],
      [/^(web_search|web_fetch)$/, 'web'],
      [/^(bash|pwsh)$/, 'shell'],
      [/^job_/, 'jobs'],
      [/^terminal_/, 'terminal'],
      [/^schedule_/, 'schedule'],
      [/^(subagent|send_message|list_agents|wait_agent|interrupt_agent|list_subagent_models)$/, 'subagent'],
      [/^team_/, 'team'],
      [/^workflow$/, 'workflow'],
      [/^(create_goal|update_goal|get_goal)$/, 'goal'],
      [/^todo_write$/, 'todo'],
      [/^present$/, 'deliverables'],
      [/^cordis_/, 'cordis'],
      [/^session_/, 'session-query'],
      [/^lsp$/, 'lsp'],
      [/^ask_user_question$/, 'question'],
    ];
    const MCP_RESOURCE_TOOLS = {
      list_mcp_resources: true,
      read_mcp_resource: true,
      list_mcp_resource_templates: true,
    };

    /* Which capability surface served one tool call. The Client only receives
     * the tool name, so plugin attribution is name-based. */
    function capabilityOf(tool) {
      const name = tool.name;
      if (!name) return null;
      if (name === 'skill') {
        const match = (tool.args || '').match(/"name"\s*:\s*"([^"]+)"/);
        return { group: 'skills', label: match ? match[1] : 'skill' };
      }
      if (name.indexOf('mcp__') === 0) {
        const parts = name.split('__');
        return {
          group: 'mcp',
          label: parts.length >= 3 ? parts[1] + '·' + parts.slice(2).join('__') : name,
        };
      }
      if (MCP_RESOURCE_TOOLS[name]) return { group: 'mcp', label: name };
      for (let index = 0; index < PLUGIN_GROUPS.length; index += 1) {
        if (PLUGIN_GROUPS[index][0].test(name)) return { group: 'plugins', label: PLUGIN_GROUPS[index][1] };
      }
      return { group: 'plugins', label: name };
    }

    /* Capabilities are aggregated over every step of the current turn, so a
     * skill loaded in step 1 stays visible while step 3 streams. */
    function capsView(attempt) {
      const out = { plugins: [], skills: [], mcp: [] };
      if (!attempt) return out;
      const index = {};
      for (let step = 0; step < state.attempts.length; step += 1) {
        const item = state.attempts[step];
        if (item.turn !== attempt.turn) continue;
        for (let position = 0; position < item.tools.length; position += 1) {
          const cap = capabilityOf(item.tools[position]);
          if (!cap) continue;
          const key = cap.group + '|' + cap.label;
          if (!index[key]) {
            index[key] = { label: cap.label, count: 0, tools: [] };
            out[cap.group].push(index[key]);
          }
          index[key].count += 1;
          if (index[key].tools.indexOf(item.tools[position].name) < 0) {
            index[key].tools.push(item.tools[position].name);
          }
        }
      }
      return out;
    }

    function capsSigOf(caps) {
      return ['plugins', 'skills', 'mcp']
        .map(group => caps[group].map(item => item.label + ':' + item.count).join(','))
        .join('|');
    }

    function build() {
      const cur = currentAttempt();
      const caps = capsView(cur);
      return {
        sessionId: state.sessionId,
        bound: state.bound,
        running: state.running,
        phase: state.phase,
        attempts: state.attempts,
        current: cur,
        rate: rateOf(state.samples),
        spark: sparkOf(state.samples),
        now: Date.now(),
        lastAt: state.lastAt,
        error: state.error,
        diag: state.diag,
        toolsSig: toolSignature(cur),
        stepsSig: stepSignature(state.attempts),
        caps: caps,
        capsSig: capsSigOf(caps),
      };
    }

    let pub = build();
    let emitTimer = null;

    function emit() {
      pub = build();
      listeners.forEach(fn => {
        try {
          fn();
        } catch (error) {
          console.error(error);
        }
      });
    }

    function touch() {
      if (emitTimer) return;
      emitTimer = setTimeout(() => {
        emitTimer = null;
        emit();
      }, 66);
    }

    function pushChars(count) {
      if (!count) return;
      const now = Date.now();
      state.chars += count;
      state.samples.push({ t: now, n: state.chars });
      if (state.samples.length > 400) state.samples.splice(0, state.samples.length - 400);
      state.lastAt = now;
    }

    /* ------------------------------------------------------------------ *
     * Live folding
     * ------------------------------------------------------------------ */
    function applyChunk(data) {
      if (!data || !data.chunk) return;
      const chunk = data.chunk;
      const attempt = ensureAttempt(data.attemptId, data.turn, data.step);
      state.running = true;
      state.lastAt = Date.now();
      state.diag.frames += 1;
      state.diag.lastKind = chunk.type;

      if (chunk.type === 'block-start') {
        if (chunk.blockType === 'reasoning') state.phase = 'thinking';
        else if (chunk.blockType === 'text') state.phase = 'answering';
        else if (chunk.blockType === 'tool-call') state.phase = 'acting';
      } else if (chunk.type === 'reasoning-delta') {
        const text = chunk.text || '';
        attempt.reasoning += text;
        if (attempt.reasoning.length > CAP.reasoning) {
          attempt.reasoning = attempt.reasoning.slice(attempt.reasoning.length - CAP.reasoning);
        }
        state.phase = 'thinking';
        pushChars(text.length);
      } else if (chunk.type === 'text-delta') {
        const text = chunk.text || '';
        attempt.text += text;
        if (attempt.text.length > CAP.text) {
          attempt.text = attempt.text.slice(attempt.text.length - CAP.text);
        }
        state.phase = 'answering';
        pushChars(text.length);
      } else if (chunk.type === 'tool-call-delta') {
        let tool = attempt.tools.find(item => item.id === chunk.id);
        if (!tool) {
          tool = { id: chunk.id, name: chunk.name || '', args: '', done: false };
          attempt.tools.push(tool);
        }
        if (chunk.name) tool.name = chunk.name;
        tool.args += chunk.argumentsDelta || '';
        if (tool.args.length > CAP.args) tool.args = tool.args.slice(0, CAP.args);
        state.phase = 'acting';
        pushChars((chunk.argumentsDelta || '').length);
      } else if (chunk.type === 'block-end') {
        const block = chunk.block;
        if (block && block.type === 'reasoning') {
          attempt.reasoning = block.text || attempt.reasoning;
          if (attempt.reasoning.length > CAP.reasoning) {
            attempt.reasoning = attempt.reasoning.slice(attempt.reasoning.length - CAP.reasoning);
          }
        } else if (block && block.type === 'text') {
          attempt.text = block.text || attempt.text;
          if (attempt.text.length > CAP.text) {
            attempt.text = attempt.text.slice(attempt.text.length - CAP.text);
          }
        } else if (block && block.type === 'tool-call') {
          let tool = attempt.tools.find(item => item.id === block.id);
          if (!tool) {
            tool = { id: block.id, name: block.name, args: '', done: false };
            attempt.tools.push(tool);
          }
          tool.name = block.name;
          tool.args = block.arguments || tool.args;
        }
      } else if (chunk.type === 'usage') {
        const usage = chunk.usage || {};
        attempt.tokens.input = Math.max(attempt.tokens.input, usage.inputTokens || 0);
        attempt.tokens.output = Math.max(attempt.tokens.output, usage.outputTokens || 0);
        attempt.tokens.reasoning = Math.max(attempt.tokens.reasoning, usage.reasoningTokens || 0);
        attempt.tokens.cache = Math.max(attempt.tokens.cache, usage.cacheReadTokens || 0);
      } else if (chunk.type === 'finish') {
        attempt.finish = chunk.reason ? chunk.reason.kind : null;
        attempt.endedAt = Date.now();
        state.phase = 'idle';
      }
      touch();
    }

    function blocksOf(event) {
      const candidates = [
        event.message && event.message.content,
        event.data && event.data.message && event.data.message.content,
        event.content,
        event.blocks,
      ];
      for (let index = 0; index < candidates.length; index += 1) {
        if (Array.isArray(candidates[index])) return candidates[index];
      }
      return null;
    }

    /* A durable assistant event carries the final content blocks. Folding them
     * keeps the last step readable after the live attempt is settled, and
     * repopulates the panel when an already-finished session is opened. */
    function reconstruct(event) {
      const blocks = blocksOf(event);
      if (!blocks) return;
      const turn = typeof event.turn === 'number' ? event.turn : event.data && event.data.turn;
      const step = typeof event.step === 'number' ? event.step : event.data && event.data.step;
      const attempt = currentAttempt() || ensureAttempt('history', turn || 0, step || 0);
      let changed = false;
      for (let index = 0; index < blocks.length; index += 1) {
        const block = blocks[index];
        if (!block || typeof block.type !== 'string') continue;
        if (block.type === 'reasoning' && block.text) {
          if (block.text.length >= attempt.reasoning.length) attempt.reasoning = block.text;
          changed = true;
        } else if (block.type === 'text' && block.text) {
          if (block.text.length >= attempt.text.length) attempt.text = block.text;
          changed = true;
        } else if (block.type === 'tool-call') {
          let tool = attempt.tools.find(item => item.id === block.id);
          if (!tool) {
            tool = { id: block.id, name: block.name, args: '', done: true };
            attempt.tools.push(tool);
          }
          tool.name = block.name || tool.name;
          tool.args = block.arguments || tool.args;
          tool.done = true;
          changed = true;
        }
      }
      if (changed) attempt.endedAt = attempt.endedAt || Date.now();
    }

    function applyEvent(event) {
      if (!event || typeof event.type !== 'string') return;
      state.diag.events += 1;
      state.diag.lastKind = event.type;
      state.lastAt = Date.now();
      const attempt = currentAttempt();
      if (event.type === 'turn/start') {
        state.phase = 'thinking';
        state.running = true;
      } else if (event.type === 'turn/end') {
        state.phase = 'idle';
        state.running = false;
        if (attempt && !attempt.endedAt) attempt.endedAt = Date.now();
      } else if (event.type === 'tool/result') {
        const callId = event.callId || (event.data && event.data.callId);
        if (attempt && callId) {
          const tool = attempt.tools.find(item => item.id === callId);
          if (tool) tool.done = true;
        }
      } else if (event.type === 'assistant/message' || event.type === 'assistant/attempt') {
        reconstruct(event);
      }
      touch();
    }

    /* ------------------------------------------------------------------ *
     * Session binding
     * ------------------------------------------------------------------ */
    const api = { sessions: null };
    let binding = null;
    let offWindow = null;
    let offSession = null;
    let offRetainInfo = null;
    let retryTimer = null;
    let retained = null;

    function onWindow() {
      if (!binding) return;
      let frame;
      try {
        frame = binding.eventSource && binding.eventSource.getSnapshot();
      } catch (error) {
        console.error(error);
        return;
      }
      if (!frame) return;
      const change = frame.change || {};
      if (change.kind === 'append') {
        const entries = change.entries || [];
        for (let index = 0; index < entries.length; index += 1) {
          const entry = entries[index];
          if (!entry) continue;
          if (entry.type === 'transient') applyChunk(entry.event && entry.event.data);
          else if (entry.type === 'event') applyEvent(entry.event);
        }
      } else if (change.kind === 'replace') {
        state.attempts = [];
        state.samples = [];
        state.chars = 0;
        state.diag.frames = 0;
        state.diag.events = 0;
        const entries = (change.entries || []).slice(-120);
        for (let index = 0; index < entries.length; index += 1) {
          const entry = entries[index];
          if (!entry) continue;
          if (entry.type === 'transient') applyChunk(entry.event && entry.event.data);
          else if (entry.type === 'event') applyEvent(entry.event);
        }
        emit();
      } else if (change.kind === 'settle-assistant') {
        const attempt = currentAttempt();
        if (attempt && !attempt.endedAt) attempt.endedAt = Date.now();
        state.phase = 'idle';
        touch();
      }
    }

    function onSession() {
      if (!binding || !binding.session) return;
      let snapshot;
      try {
        snapshot = binding.session.getSnapshot();
      } catch (error) {
        console.error(error);
        return;
      }
      if (!snapshot) return;
      state.running = Boolean(snapshot.running);
      state.error = snapshot.lastAgentError || null;
      touch();
    }

    function attach(next) {
      binding = next;
      state.bound = true;
      try {
        offWindow = next.eventSource.subscribe(onWindow);
        offSession = next.session && next.session.subscribe(onSession);
      } catch (error) {
        console.error(error);
      }
      onSession();
      onWindow();
      emit();
    }

    function detach() {
      offWindow && offWindow();
      offSession && offSession();
      offWindow = null;
      offSession = null;
      binding = null;
      state.bound = false;
      if (retryTimer) {
        clearInterval(retryTimer);
        retryTimer = null;
      }
      if (offRetainInfo) {
        offRetainInfo();
        offRetainInfo = null;
      }
      if (retained) {
        try {
          retained.release();
        } catch (error) {
          console.error(error);
        }
        retained = null;
      }
    }

    function tryBinding() {
      if (binding) return true;
      if (!api.sessions || !state.sessionId) return false;
      state.diag.bindTries += 1;
      try {
        const found = api.sessions.binding(state.sessionId);
        if (found) {
          attach(found);
          return true;
        }
      } catch (error) {
        console.error(error);
      }
      return false;
    }

    function bindSession(sessionId) {
      detach();
      state = {
        sessionId: sessionId || null,
        bound: false,
        running: false,
        phase: 'idle',
        attempts: [],
        chars: 0,
        samples: [],
        lastAt: 0,
        error: null,
        diag: { frames: 0, events: 0, lastKind: 'none', bindTries: 0 },
      };
      emit();
      if (!sessionId || !api.sessions) return;
      if (tryBinding()) return;

      try {
        const info = api.sessions.retainInfo(sessionId);
        offRetainInfo = info.subscribe(() => {
          const snapshot = info.getSnapshot();
          if (snapshot && snapshot.referenceCount > 0) tryBinding();
        });
        const snapshot = info.getSnapshot();
        if (snapshot && snapshot.referenceCount > 0 && tryBinding()) return;
      } catch (error) {
        console.error(error);
      }

      let tries = 0;
      retryTimer = setInterval(() => {
        tries += 1;
        if (tryBinding() || tries > 40) {
          clearInterval(retryTimer);
          retryTimer = null;
          if (tries > 40 && !binding) holdOwnReference();
        }
      }, 250);
    }

    /* Last resort: the conversation view has not retained this session, so hold
     * one reference ourselves. Only two source keys exist; the controller key
     * is the closer one for a UI consumer. */
    function holdOwnReference() {
      if (!api.sessions || !state.sessionId || binding) return;
      try {
        const reference = api.sessions.retain(state.sessionId, { source: 'controllerOperation' });
        retained = reference;
        Promise.resolve(reference.ready)
          .then(ready => {
            if (!binding && ready) attach(ready);
          })
          .catch(error => {
            console.error(error);
          });
      } catch (error) {
        console.error(error);
      }
    }

    /* ------------------------------------------------------------------ *
     * Helpers
     * ------------------------------------------------------------------ */
    function statusOf(snapshot) {
      if (!snapshot.bound) return 'unbound';
      if (!snapshot.running) {
        return snapshot.current && snapshot.current.endedAt ? 'done' : 'idle';
      }
      if (snapshot.phase === 'acting') return 'acting';
      if (snapshot.phase === 'answering') return 'answering';
      if (snapshot.phase === 'idle') return 'waiting';
      return 'thinking';
    }

    const STATUS_COLOR = {
      thinking: 'var(--dsw-alias-brand-primary)',
      acting: 'var(--dsw-alias-state-warn-primary)',
      answering: 'var(--dsw-alias-state-success-primary)',
      done: 'var(--dsw-alias-state-success-primary)',
      idle: 'var(--dsw-alias-state-idle-primary)',
      waiting: 'var(--dsw-alias-state-idle-primary)',
      unbound: 'var(--dsw-alias-state-idle-primary)',
    };

    function statusText(status) {
      if (status === 'thinking') return t('thinking');
      if (status === 'acting') return t('acting');
      if (status === 'answering') return t('answering');
      if (status === 'done') return t('done');
      if (status === 'waiting') return t('waiting');
      if (status === 'unbound') return t('unbound');
      return t('idle');
    }

    function formatDuration(ms) {
      if (!ms || ms < 0) return '0.0s';
      const seconds = ms / 1000;
      if (seconds < 60) return seconds.toFixed(1) + 's';
      const minutes = Math.floor(seconds / 60);
      return minutes + 'm ' + Math.round(seconds % 60) + 's';
    }

    function formatCount(value) {
      if (!value) return '0';
      if (value >= 10000) return (value / 1000).toFixed(1) + 'k';
      return String(value);
    }

    function attemptStats(attempt) {
      const reasoning = attempt.reasoning.length;
      const text = attempt.text.length;
      const tool = attempt.tools.reduce((total, item) => total + item.args.length, 0);
      const sum = Math.max(1, reasoning + text + tool);
      return {
        reasoning: reasoning,
        text: text,
        tool: tool,
        pr: (reasoning / sum) * 100,
        pt: (text / sum) * 100,
        pl: (tool / sum) * 100,
      };
    }

    const TOOL_GLYPHS = [
      [/read|image|glob|list/i, '▤'],
      [/grep|search|find/i, '⌕'],
      [/write|edit|patch|apply/i, '✎'],
      [/bash|shell|pwsh|terminal|exec/i, '❯'],
      [/web|fetch|http|curl/i, '⌘'],
      [/skill/i, '✦'],
      [/subagent|agent|task|team/i, '⧉'],
      [/todo|plan|goal/i, '◈'],
    ];

    function toolGlyph(name) {
      for (let index = 0; index < TOOL_GLYPHS.length; index += 1) {
        if (TOOL_GLYPHS[index][0].test(name || '')) return TOOL_GLYPHS[index][1];
      }
      return '◆';
    }

    function toolHint(tool) {
      const args = (tool.args || '').trim();
      if (!args) return '…';
      if (args.charAt(0) === '{') {
        try {
          const parsed = JSON.parse(args);
          const fields = ['command', 'file_path', 'path', 'pattern', 'query', 'url', 'description', 'skill', 'name', 'message'];
          for (let index = 0; index < fields.length; index += 1) {
            const value = parsed[fields[index]];
            if (typeof value === 'string' && value) {
              return value.replace(/\s+/g, ' ').slice(0, 96);
            }
          }
        } catch (error) {
          /* streaming JSON is usually incomplete */
        }
      }
      const match = args.match(/"(?:command|file_path|path|pattern|query|url|description|skill|name)"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (match) return match[1].replace(/\\n/g, ' ').replace(/\s+/g, ' ').slice(0, 96);
      return args.replace(/\s+/g, ' ').slice(0, 96);
    }

    function sparkPath(values) {
      if (!values || values.length < 2) return '';
      const max = Math.max.apply(null, values.concat([1]));
      return values
        .map((value, index) => {
          const x = (index / (values.length - 1)) * 100;
          const y = 22 - (value / max) * 20;
          return x.toFixed(2) + ',' + y.toFixed(2);
        })
        .join(' ');
    }

    /* ------------------------------------------------------------------ *
     * Components
     * ------------------------------------------------------------------ */
    function useStore() {
      const [, force] = React.useState(0);
      React.useEffect(() => {
        const listener = () => force(value => value + 1);
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      }, []);
      return pub;
    }

    function SessionBridge(props) {
      const sessionId = props && props.sessionId;
      React.useEffect(() => {
        bindSession(sessionId);
        return () => {
          detach();
        };
      }, [sessionId]);
      return null;
    }

    const FIELD_COLS = 96;
    const FIELD_ROWS = 24;
    const FIELD_TOTAL = FIELD_COLS * FIELD_ROWS;
    const PET_MASK = [
      '........gg.gg.',
      '.........G.G..',
      '.........gg...',
      '....hhbbbbbb..',
      '..hhbbbbbbbb..',
      '.hbbbbbbbbbbb.',
      '.dbbbbbbbbbweb',
      '.dblllllllbbb.',
      'ddbblllllllbd.',
    ];
    const PET_WIDTH = PET_MASK[0].length;
    const PET_HEIGHT = PET_MASK.length;
    const FIELD_STATE = {
      values: new Float32Array(FIELD_TOTAL),
      time: 0,
      rate: 0,
      running: false,
      acc: 0,
      pet: { x: 10, y: 4, tx: 10, ty: 4, jumpUntil: 0, nextJump: 0, nextMove: 0, blinkUntil: 0, nextBlink: 0 },
      reduced: false,
    };

    /* Wall simulation: exponential fade, a soft scan band, and ignitions whose
     * count follows the live token rate. */
    function stepField(dt, now) {
      FIELD_STATE.time += dt;
      const values = FIELD_STATE.values;
      const decay = Math.exp(-dt / 520);
      for (let index = 0; index < values.length; index += 1) values[index] *= decay;

      FIELD_STATE.acc += (FIELD_STATE.rate * dt) / 1000 / 4 + (dt / 1000) * 22;
      while (FIELD_STATE.acc >= 1) {
        FIELD_STATE.acc -= 1;
        values[Math.floor(Math.random() * FIELD_TOTAL)] = 0.6 + Math.random() * 0.4;
      }

      const span = FIELD_COLS + 12;
      const scan = ((FIELD_STATE.time * 0.006) % span) - 6;
      for (let column = 0; column < FIELD_COLS; column += 1) {
        const distance = Math.abs(column - scan);
        if (distance > 2.5) continue;
        const boost = (1 - distance / 2.5) * 0.5;
        for (let row = 0; row < FIELD_ROWS; row += 1) {
          const index = row * FIELD_COLS + column;
          if (values[index] < boost) values[index] += (boost - values[index]) * 0.3;
        }
      }

      const pet = FIELD_STATE.pet;
      if (now > pet.nextBlink) {
        pet.blinkUntil = now + 130;
        pet.nextBlink = now + 2200 + Math.random() * 3600;
      }
      if (FIELD_STATE.running) {
        if (now > pet.nextMove) {
          pet.tx = 4 + Math.random() * (FIELD_COLS - PET_WIDTH - 8);
          pet.ty = 3 + Math.floor(Math.random() * (FIELD_ROWS - PET_HEIGHT - 2));
          pet.nextMove = now + 1600 + Math.random() * 2200;
        }
        if (!prefs.calm && !FIELD_STATE.reduced && now > pet.nextJump) {
          pet.jumpUntil = now + 360;
          pet.nextJump = now + 480 + Math.random() * 900;
        }
      } else {
        pet.nextMove = now + 1600;
        pet.nextJump = now + 700;
      }
      const ease = Math.min(1, dt / 320);
      pet.x += (pet.tx - pet.x) * ease;
      pet.y += (pet.ty - pet.y) * ease;
    }

    function petLift(now) {
      const pet = FIELD_STATE.pet;
      if (now < pet.jumpUntil) {
        const progress = 1 - (pet.jumpUntil - now) / 360;
        return Math.sin(Math.PI * progress) * 2;
      }
      if (!FIELD_STATE.running) return Math.sin(now / 900) * 0.16;
      return 0;
    }

    /* Body cells reuse the phase color; highlight and belly are white overlays,
     * so the whale keeps its shape when the accent turns amber or green. */
    const PET_STYLE = {
      b: { alpha: 0.96 },
      d: { alpha: 0.6 },
      h: { alpha: 0.96, overlay: 0.3 },
      l: { alpha: 0.96, overlay: 0.58 },
      w: { fill: '#FFFFFF', alpha: 0.96 },
      e: { fill: '#16213E', alpha: 0.95 },
      s: { fill: '#9FE8FF', alpha: 0.92 },
      g: { fill: '#8CE0A4', alpha: 0.96 },
      G: { fill: '#4FB56F', alpha: 0.96 },
    };

    function drawPet(ctx, now, cellWidth, cellHeight, color) {
      if (!prefs.pet) return;
      const pet = FIELD_STATE.pet;
      const lift = petLift(now);
      const blinking = now < pet.blinkUntil;
      const originX = pet.x * cellWidth;
      const originY = (pet.y - lift) * cellHeight;
      const width = PET_WIDTH * cellWidth;
      const height = PET_HEIGHT * cellHeight;

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.18 * Math.max(0.25, 1 - lift / 2.4);
      ctx.beginPath();
      ctx.ellipse(originX + width / 2, originY + height + 1.5, width * 0.34, Math.max(1.2, cellHeight * 0.5), 0, 0, Math.PI * 2);
      ctx.fill();

      for (let row = 0; row < PET_HEIGHT; row += 1) {
        const line = PET_MASK[row];
        for (let column = 0; column < PET_WIDTH; column += 1) {
          const glyph = line.charAt(column);
          if (glyph === '.') continue;
          let style = PET_STYLE[glyph] || { alpha: 0.9 };
          if (blinking && (glyph === 'w' || glyph === 'e')) style = PET_STYLE.b;
          const x = originX + column * cellWidth + 0.3;
          const y = originY + row * cellHeight + 0.3;
          const w = Math.max(1, cellWidth - 0.6);
          const h = Math.max(1, cellHeight - 0.6);

          ctx.fillStyle = style.fill || color;
          ctx.globalAlpha = style.alpha;
          ctx.fillRect(x, y, w, h);

          if (style.overlay) {
            ctx.fillStyle = '#FFFFFF';
            ctx.globalAlpha = style.overlay;
            ctx.fillRect(x, y, w, h);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    function readTokenColor(element, raw) {
      const match = /var\((--[^),]+)/.exec(raw || '');
      if (!match) return raw || '#6EA8FF';
      const value = getComputedStyle(element).getPropertyValue(match[1]).trim();
      return value || '#6EA8FF';
    }

    /* The wall is a canvas: 2304 cells re-created per frame would be far too
     * expensive, so the base texture is drawn once and blitted, then only the
     * live cells and the pet are painted. */
    function BlockField(props) {
      const canvasRef = React.useRef(null);
      const propsRef = React.useRef(props);
      propsRef.current = props;

      React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;

        const base = document.createElement('canvas');
        const baseCtx = base.getContext('2d');
        let cssWidth = 1;
        let cssHeight = 1;
        let dpr = 1;
        let color = '#6EA8FF';
        let colorSource = '';

        const paintBase = () => {
          if (!baseCtx) return;
          baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          baseCtx.clearRect(0, 0, cssWidth, cssHeight);
          const cellWidth = cssWidth / FIELD_COLS;
          const cellHeight = cssHeight / FIELD_ROWS;
          baseCtx.fillStyle = color;
          baseCtx.globalAlpha = 0.055;
          for (let row = 0; row < FIELD_ROWS; row += 1) {
            for (let column = 0; column < FIELD_COLS; column += 1) {
              baseCtx.fillRect(
                column * cellWidth + 0.35,
                row * cellHeight + 0.35,
                Math.max(1, cellWidth - 0.7),
                Math.max(1, cellHeight - 0.7),
              );
            }
          }
          baseCtx.globalAlpha = 1;
        };

        const resize = () => {
          const rect = canvas.getBoundingClientRect();
          cssWidth = Math.max(1, rect.width);
          cssHeight = Math.max(1, rect.height);
          dpr = Math.min(2, window.devicePixelRatio || 1);
          canvas.width = Math.max(1, Math.round(cssWidth * dpr));
          canvas.height = Math.max(1, Math.round(cssHeight * dpr));
          base.width = canvas.width;
          base.height = canvas.height;
          colorSource = propsRef.current.color;
          color = readTokenColor(canvas, colorSource);
          paintBase();
        };

        resize();
        const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
        if (observer) observer.observe(canvas);

        const reducedMotion =
          typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
        FIELD_STATE.reduced = reducedMotion;
        let raf = 0;
        let last = 0;
        let ticks = 0;
        const frame = now => {
          raf = requestAnimationFrame(frame);
          if (!last) last = now;
          const elapsed = now - last;
          const minInterval = reducedMotion || prefs.calm ? 120 : FIELD_STATE.running ? 33 : 60;
          if (elapsed < minInterval) return;
          const dt = Math.min(64, elapsed);
          last = now;
          ticks += 1;
          stepField(dt, now);

          if (propsRef.current.color !== colorSource) {
            colorSource = propsRef.current.color;
            color = readTokenColor(canvas, colorSource);
            paintBase();
          } else if (ticks % 30 === 0) {
            const next = readTokenColor(canvas, colorSource);
            if (next !== color) {
              color = next;
              paintBase();
            }
          }

          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(base, 0, 0);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

          const cellWidth = cssWidth / FIELD_COLS;
          const cellHeight = cssHeight / FIELD_ROWS;
          const values = FIELD_STATE.values;
          ctx.fillStyle = color;
          for (let index = 0; index < values.length; index += 1) {
            const value = values[index];
            if (value < 0.02) continue;
            const row = (index / FIELD_COLS) | 0;
            const column = index - row * FIELD_COLS;
            ctx.globalAlpha = Math.min(0.92, 0.08 + value * 0.82);
            ctx.fillRect(
              column * cellWidth + 0.35,
              row * cellHeight + 0.35,
              Math.max(1, cellWidth - 0.7),
              Math.max(1, cellHeight - 0.7),
            );
          }
          ctx.globalAlpha = 1;
          drawPet(ctx, now, cellWidth, cellHeight, color);
        };
        raf = requestAnimationFrame(frame);

        return () => {
          cancelAnimationFrame(raf);
          if (observer) observer.disconnect();
        };
      }, []);

      return h('canvas', {
        className: 'dshch-field',
        ref: canvasRef,
        'aria-hidden': true,
      });
    }

    function ThoughtPanel(props) {
      FIELD_STATE.running = props.running;
      FIELD_STATE.rate = props.rate;
      const attempt = props.attempt;
      const text = attempt ? attempt.reasoning : '';
      if (props.showText) {
        return h('div', { className: 'dshch-thought-slot' }, h(ThoughtStream, { attempt: attempt, show: true }));
      }
      const tail = text ? text.replace(/\s+/g, ' ').slice(-110) : t('noStream');
      return h(
        'div',
        { className: 'dshch-thought-slot' },
        h(BlockField, { color: props.color }),
        h('div', { className: 'dshch-ticker' }, tail),
      );
    }

    function ThoughtStream(props) {
      const attempt = props.attempt;
      const show = props.show;
      const ref = React.useRef(null);
      const text = attempt ? attempt.reasoning : '';
      const hidden = Math.max(0, text.length - VIEW);
      const visible = hidden ? text.slice(hidden) : text;
      React.useEffect(() => {
        const element = ref.current;
        if (element) element.scrollTop = element.scrollHeight;
      }, [text.length]);
      if (!attempt) return null;
      if (!show) {
        return h('div', { className: 'dshch-muted' }, formatCount(text.length) + ' ' + t('chars'));
      }
      if (!text.length) {
        return h('div', { className: 'dshch-muted' }, t('noStream'));
      }
      return h(
        'div',
        { className: 'dshch-thought', ref: ref, tabIndex: 0, title: t('showThoughts') },
        hidden ? h('div', { className: 'dshch-folded' }, '↑ ' + formatCount(hidden) + ' ' + t('hidden')) : null,
        visible,
        h('span', { className: 'dshch-caret', 'aria-hidden': true }),
      );
    }

    const ToolList = React.memo(
      function ToolList(props) {
        const tools = props.tools;
        if (!tools.length) {
          return h('div', { className: 'dshch-muted' }, '—');
        }
        return h(
          'div',
          { className: 'dshch-tools' },
          tools.slice(-4).map((tool, index) =>
            h(
              'div',
              { key: tool.id || 'tool-' + index, className: 'dshch-tool' + (tool.done ? ' is-done' : '') },
              h('span', { className: 'dshch-tool-glyph', 'aria-hidden': true }, toolGlyph(tool.name)),
              h('span', { className: 'dshch-tool-name' }, tool.name || 'tool'),
              h('span', { className: 'dshch-tool-args' }, toolHint(tool)),
            ),
          ),
        );
      },
      (a, b) => a.sig === b.sig,
    );

    const StepList = React.memo(
      function StepList(props) {
        const attempts = props.attempts;
        if (!attempts.length) return null;
        return h(
          'div',
          { className: 'dshch-steps' },
          attempts
            .slice(-2)
            .reverse()
            .map((attempt, index) => {
              const stats = attemptStats(attempt);
              const duration = (attempt.endedAt || Date.now()) - attempt.startedAt;
              return h(
                'div',
                { key: attempt.id || 'step-' + index, className: 'dshch-step' },
                h('span', { className: 'dshch-step-id' }, 'T' + attempt.turn + '·S' + attempt.step),
                h(
                  'span',
                  { className: 'dshch-step-bar' },
                  h('i', { className: 'is-tool', style: { flexGrow: stats.pl } }),
                  h('i', { className: 'is-text', style: { flexGrow: stats.pt } }),
                  h('i', { className: 'is-reasoning', style: { flexGrow: stats.pr } }),
                ),
                h('span', { className: 'dshch-step-meta' }, formatCount(stats.reasoning) + ' · ' + formatDuration(duration)),
              );
            }),
        );
      },
      (a, b) => a.sig === b.sig,
    );

    const ORB_WAVE = 'M0 32 Q 8 27 16 32 T 32 32 T 48 32 T 64 32 V48 H0 Z';

    function orbLevel(status) {
      if (status === 'thinking') return 0.34;
      if (status === 'acting') return 0.52;
      if (status === 'answering') return 0.82;
      if (status === 'waiting') return 0.3;
      if (status === 'done') return 0.46;
      if (status === 'unbound') return 0.08;
      return 0.16;
    }

    /* The collapsed orb: a liquid surface inside the circle. The level follows
     * the live phase; the drift animation runs only while the agent is working. */
    function Orb(props) {
      const level = props.level;
      const color = props.color;
      const running = props.running;
      const offset = 32 - level * 52;
      return h(
        'svg',
        { className: 'dshch-orb', viewBox: '0 0 64 64', 'aria-hidden': true },
        h('defs', null, h('clipPath', { id: 'dshch-orb-clip' }, h('circle', { cx: 32, cy: 32, r: 21 }))),
        h(
          'g',
          { clipPath: 'url(#dshch-orb-clip)' },
          h(
            'g',
            {
              className: 'dshch-water',
              style: {
                transform: 'translateY(' + offset.toFixed(2) + 'px)',
                transition: 'transform .7s cubic-bezier(.22,1,.36,1)',
              },
            },
            h(
              'g',
              { className: 'dshch-drift' + (running ? ' is-live' : '') },
              h('path', { d: ORB_WAVE, opacity: '0.5', style: { fill: color } }),
              h('path', { d: ORB_WAVE, opacity: '0.5', style: { fill: color }, transform: 'translate(64 0)' }),
            ),
            h('rect', { x: 0, y: 32, width: 64, height: 160, opacity: '0.5', style: { fill: color } }),
          ),
        ),
        h('circle', { cx: 32, cy: 32, r: 21, fill: 'none', stroke: color, strokeWidth: '1.2', opacity: '0.5' }),
      );
    }

    const CapabilityStrip = React.memo(
      function CapabilityStrip(props) {
        const caps = props.caps;
        const rows = [
          { key: 'capPlugins', items: caps.plugins, hint: t('capPluginsHint') },
          { key: 'capSkills', items: caps.skills, hint: null },
          { key: 'capMcp', items: caps.mcp, hint: null },
        ];
        return h(
          'div',
          { className: 'dshch-caps' },
          rows.map(row =>
            h(
              'div',
              { className: 'dshch-cap-row', key: row.key },
              h('span', { className: 'dshch-cap-label', title: row.hint || null }, t(row.key)),
              h(
                'div',
                { className: 'dshch-cap-chips' },
                row.items.length
                  ? row.items.map((item, index) =>
                      h(
                        'span',
                        {
                          key: item.label + ':' + index,
                          className: 'dshch-chip',
                          title: item.tools.join(' · '),
                        },
                        item.label + (item.count > 1 ? ' ×' + item.count : ''),
                      ),
                    )
                  : h('span', { className: 'dshch-cap-none' }, '—'),
              ),
            ),
          ),
        );
      },
      (a, b) => a.sig === b.sig,
    );

    function CognitionHud() {
      const snapshot = useStore();
      const [open, setOpen] = React.useState(prefs.open);
      const [, tick] = React.useState(0);
      const [pos, setPos] = React.useState(prefs.pos);
      const [menu, setMenu] = React.useState(null);
      const [hidden, setHidden] = React.useState(prefs.hidden);
      const dragRef = React.useRef(null);
      const running = snapshot.running;

      React.useEffect(() => {
        if (!running) return undefined;
        const timer = setInterval(() => tick(value => value + 1), 500);
        return () => clearInterval(timer);
      }, [running]);

      const status = statusOf(snapshot);
      const attempt = snapshot.current;
      const color = STATUS_COLOR[status] || STATUS_COLOR.idle;
      const elapsed = attempt ? (attempt.endedAt || snapshot.now) - attempt.startedAt : 0;
      const stats = attempt ? attemptStats(attempt) : { reasoning: 0, text: 0, tool: 0 };
      const tokens = attempt ? attempt.tokens : { input: 0, output: 0, reasoning: 0, cache: 0 };
      const idleMs = snapshot.now - (attempt ? attempt.endedAt || attempt.startedAt : snapshot.now);
      const diagTitle =
        t('diag') +
        ': ' +
        (snapshot.bound ? t('bound') : '–') +
        ' · ' +
        snapshot.diag.frames +
        ' ' +
        t('frames') +
        ' · ' +
        snapshot.diag.events +
        ' ' +
        t('events');

      const toggleOpen = () => {
        prefs.open = !open;
        savePrefs();
        setOpen(!open);
      };

      const toggleThoughts = () => {
        prefs.showThoughts = !prefs.showThoughts;
        savePrefs();
        tick(value => value + 1);
      };

      const togglePet = () => {
        prefs.pet = !prefs.pet;
        savePrefs();
        tick(value => value + 1);
      };

      const toggleCalm = () => {
        prefs.calm = !prefs.calm;
        savePrefs();
        tick(value => value + 1);
      };

      const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

      const beginDrag = event => {
        if (event.button !== 0) return;
        const rect = event.currentTarget.getBoundingClientRect();
        dragRef.current = { px: event.clientX, py: event.clientY, ox: rect.left, oy: rect.top, moved: false };
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch (error) {
          console.error(error);
        }
      };

      const moveDrag = event => {
        const drag = dragRef.current;
        if (!drag) return;
        const dx = event.clientX - drag.px;
        const dy = event.clientY - drag.py;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
        drag.moved = true;
        const next = {
          x: clamp(drag.ox + dx, 6, Math.max(8, window.innerWidth - 52)),
          y: clamp(drag.oy + dy, 6, Math.max(8, window.innerHeight - 52)),
        };
        prefs.pos = next;
        setPos(next);
        event.preventDefault();
      };

      const endDrag = () => {
        const drag = dragRef.current;
        dragRef.current = null;
        if (drag && drag.moved) {
          savePrefs();
          return;
        }
        if (drag) toggleOpen();
      };

      const cancelDrag = () => {
        dragRef.current = null;
      };

      const openMenu = event => {
        event.preventDefault();
        event.stopPropagation();
        setMenu({ x: event.clientX, y: event.clientY });
      };

      const closeMenu = () => setMenu(null);

      const resetPos = () => {
        prefs.pos = null;
        savePrefs();
        setPos(null);
      };

      const closeHud = () => {
        prefs.hidden = true;
        setMenu(null);
        setHidden(true);
      };

      const onKeyDown = event => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        if (menu) {
          closeMenu();
          return;
        }
        prefs.open = false;
        setOpen(false);
      };

      const styleTag = h('style', null, CSS);
      if (hidden) return null;

      const menuNode = menu
        ? h(
            React.Fragment,
            null,
            h('div', {
              className: 'dshch-backdrop',
              onPointerDown: closeMenu,
              onContextMenu: event => {
                event.preventDefault();
                closeMenu();
              },
            }),
            h(
              'div',
              {
                className: 'dshch-menu',
                role: 'menu',
                style: {
                  left: Math.min(menu.x, Math.max(8, window.innerWidth - 208)) + 'px',
                  top: Math.min(menu.y, Math.max(8, window.innerHeight - 240)) + 'px',
                },
              },
              h(
                'button',
                {
                  type: 'button',
                  role: 'menuitem',
                  className: 'dshch-menu-item',
                  onClick: () => {
                    closeMenu();
                    toggleOpen();
                  },
                },
                open ? t('menuCollapse') : t('menuExpand'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  role: 'menuitem',
                  className: 'dshch-menu-item',
                  onClick: () => {
                    closeMenu();
                    toggleThoughts();
                  },
                },
                prefs.showThoughts ? t('menuHideThoughts') : t('menuShowThoughts'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  role: 'menuitem',
                  className: 'dshch-menu-item',
                  onClick: () => {
                    closeMenu();
                    togglePet();
                  },
                },
                prefs.pet ? t('menuPetHide') : t('menuPetShow'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  role: 'menuitem',
                  className: 'dshch-menu-item',
                  onClick: () => {
                    closeMenu();
                    toggleCalm();
                  },
                },
                prefs.calm ? t('menuSmooth') : t('menuCalm'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  role: 'menuitem',
                  className: 'dshch-menu-item',
                  onClick: () => {
                    closeMenu();
                    resetPos();
                  },
                },
                t('menuReset'),
              ),
              h('div', { className: 'dshch-menu-sep' }),
              h(
                'button',
                {
                  type: 'button',
                  role: 'menuitem',
                  className: 'dshch-menu-item is-danger',
                  onClick: () => {
                    closeMenu();
                    closeHud();
                  },
                },
                t('menuClose'),
              ),
            ),
          )
        : null;

      if (!open) {
        return h(
          React.Fragment,
          null,
          styleTag,
          h(
            'div',
            {
              className: 'dshch is-collapsed',
              style: pos ? { left: pos.x + 'px', top: pos.y + 'px', right: 'auto' } : null,
            },
            h(
              'button',
              {
                type: 'button',
                className: 'dshch-pill' + (running ? ' is-live' : ''),
                onPointerDown: beginDrag,
                onPointerMove: moveDrag,
                onPointerUp: endDrag,
                onPointerCancel: cancelDrag,
                onContextMenu: openMenu,
                onKeyDown: event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleOpen();
                  }
                },
                title: t('orbHint'),
                'aria-label': t('expand'),
                style: { borderColor: color, touchAction: 'none' },
              },
              h(Orb, { level: orbLevel(status), color: color, running: running }),
              h(
                'span',
                { className: 'dshch-pill-text' },
                running ? formatCount(snapshot.rate) : formatCount(tokens.reasoning || tokens.output),
              ),
            ),
            menuNode,
          ),
        );
      }

      return h(
        React.Fragment,
        null,
        styleTag,
        h(
          'div',
          {
            className: 'dshch' + (running ? '' : idleMs > 20000 ? ' is-idle' : ''),
            onKeyDown: onKeyDown,
            onContextMenu: openMenu,
          },
          h(
            'section',
            { className: 'dshch-panel', 'aria-label': t('title') },
            h('div', { className: 'dshch-accent', style: { background: color } }),
            h(
              'header',
              { className: 'dshch-head' },
              h('span', {
                className: 'dshch-dot' + (running ? ' is-live' : ''),
                style: { background: color },
                'aria-hidden': true,
              }),
              h('span', { className: 'dshch-status', style: { color: color } }, statusText(status)),
              attempt
                ? h('span', { className: 'dshch-meta' }, 'T' + attempt.turn + '·S' + attempt.step)
                : null,
              h('span', { className: 'dshch-meta dshch-elapsed' }, formatDuration(elapsed)),
              h('span', { className: 'dshch-spacer' }),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dshch-icon' + (prefs.showThoughts ? ' is-on' : ''),
                  onClick: toggleThoughts,
                  title: prefs.showThoughts ? t('hideThoughts') : t('showThoughts'),
                  'aria-label': prefs.showThoughts ? t('hideThoughts') : t('showThoughts'),
                  'aria-pressed': prefs.showThoughts,
                },
                prefs.showThoughts ? '◉' : '◎',
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dshch-icon',
                  onClick: toggleOpen,
                  title: t('collapse'),
                  'aria-label': t('collapse'),
                },
                '–',
              ),
            ),
            h(
              'div',
              { className: 'dshch-section is-thought' },
              h(
                'div',
                { className: 'dshch-section-head' },
                h('span', { className: 'dshch-label' }, t('thought')),
                h('span', { className: 'dshch-count' }, formatCount(stats.reasoning) + ' ' + t('chars')),
                h('span', { className: 'dshch-rate', style: { color: color } }, formatCount(snapshot.rate) + ' ' + t('rate')),
              ),
              h(ThoughtPanel, {
                attempt: attempt,
                running: running,
                rate: snapshot.rate,
                color: color,
                showText: prefs.showThoughts,
              }),
            ),
            h(
              'svg',
              {
                className: 'dshch-spark' + (running ? ' is-live' : ''),
                viewBox: '0 0 100 24',
                preserveAspectRatio: 'none',
                'aria-hidden': true,
              },
              h('polyline', {
                points: sparkPath(snapshot.spark),
                fill: 'none',
                stroke: color,
                strokeWidth: '1.1',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                opacity: '0.85',
              }),
            ),
            snapshot.error
              ? h('div', { className: 'dshch-error' }, h('b', null, t('error') + ': '), snapshot.error)
              : null,
            snapshot.bound
              ? null
              : h(
                  'div',
                  { className: 'dshch-empty' },
                  h('div', { className: 'dshch-empty-title', title: diagTitle }, t('unbound')),
                  h('div', { className: 'dshch-empty-hint' }, t('unboundHint')),
                ),

            h(
              'div',
              { className: 'dshch-section is-grow' },
              h(
                'div',
                { className: 'dshch-section-head' },
                h('span', { className: 'dshch-label' }, t('tools')),
                h('span', { className: 'dshch-count' }, String(attempt ? attempt.tools.length : 0)),
              ),
              h(ToolList, { tools: attempt ? attempt.tools : [], sig: snapshot.toolsSig }),
            ),
            h(CapabilityStrip, { caps: snapshot.caps, sig: snapshot.capsSig }),
            h(
              'div',
              { className: 'dshch-section' },
              h('div', { className: 'dshch-section-head' }, h('span', { className: 'dshch-label' }, t('steps'))),
              h(StepList, { attempts: snapshot.attempts, sig: snapshot.stepsSig }),
              h(
                'div',
                { className: 'dshch-legend' },
                h('span', null, h('i', { className: 'is-reasoning' }), t('legendReasoning')),
                h('span', null, h('i', { className: 'is-text' }), t('legendText')),
                h('span', null, h('i', { className: 'is-tool' }), t('legendTool')),
              ),
            ),
            h(
              'footer',
              { className: 'dshch-foot', title: diagTitle },
              h('span', null, t('ctx') + ' ' + formatCount(tokens.input)),
              h('span', null, t('out') + ' ' + formatCount(tokens.output)),
              h('span', null, t('reasoningTokens') + ' ' + formatCount(tokens.reasoning)),
              tokens.cache ? h('span', null, 'cache ' + formatCount(tokens.cache)) : null,
              attempt && attempt.finish && attempt.finish !== 'stop'
                ? h('span', { className: 'dshch-warn' }, attempt.finish)
                : null,
            ),
          ),
        ),
        menuNode,
      );
    }

    /* ------------------------------------------------------------------ *
     * Styles (theme tokens only)
     * ------------------------------------------------------------------ */
    const CSS = [
      '.dshch{position:fixed;top:120px;right:20px;z-index:25;width:min(384px,calc(100vw - 32px));',
      'pointer-events:none;color:var(--dsw-alias-label-primary);font-size:12px;line-height:1.45;',
      'font-family:inherit;text-align:left;transition:opacity .35s ease}',
      '.dshch.is-idle{opacity:.72}',
      '.dshch-panel{pointer-events:auto;position:relative;display:flex;flex-direction:column;gap:9px;',
      'padding:12px 12px 10px;height:min(520px,calc(100vh - 120px));border-radius:16px;overflow:hidden;',
      'background:var(--dsw-alias-bg-overlay);',
      'background:color-mix(in srgb,var(--dsw-alias-bg-overlay) 84%,transparent);',
      'border:1px solid var(--dsw-alias-border-l1);',
      'box-shadow:0 20px 52px rgba(0,0,0,.28),0 2px 10px rgba(0,0,0,.16);',
      'backdrop-filter:blur(18px) saturate(1.25);-webkit-backdrop-filter:blur(18px) saturate(1.25)}',
      '.dshch-accent{position:absolute;left:0;right:0;top:0;height:2px;opacity:.85}',
      '.dshch-head{display:flex;align-items:center;gap:7px;min-height:20px;padding-top:2px}',
      '.dshch-dot{width:8px;height:8px;border-radius:50%;flex:0 0 auto}',
      '.dshch-dot.is-live{animation:dshch-pulse 1.5s ease-in-out infinite}',
      '@keyframes dshch-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.78);opacity:.6}}',
      '.dshch-status{font-weight:600;font-size:11.5px;letter-spacing:.02em}',
      '.dshch-meta{color:var(--dsw-alias-label-tertiary);font-size:11px;font-variant-numeric:tabular-nums}',
      '.dshch-spacer{flex:1 1 auto}',
      '.dshch-icon{pointer-events:auto;width:22px;height:22px;display:inline-flex;align-items:center;',
      'justify-content:center;border:1px solid transparent;border-radius:7px;background:transparent;',
      'color:var(--dsw-alias-label-tertiary);font-size:12px;cursor:pointer;padding:0;line-height:1}',
      '.dshch-icon:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.dshch-icon:focus-visible{outline:2px solid var(--dsw-focus-ring-color);outline-offset:1px}',
      '.dshch-icon.is-on{color:var(--dsw-alias-brand-primary)}',
      '.dshch-spark{width:100%;height:22px;display:block;opacity:.55}',
      '.dshch-spark.is-live{opacity:.9}',
      '.dshch-error{font-size:10.5px;color:var(--dsw-alias-state-error-primary);line-height:1.4;',
      'padding:5px 7px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);',
      'overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}',
      '.dshch-empty{display:flex;flex-direction:column;gap:2px;padding:6px 8px;border-radius:9px;',
      'background:var(--dsw-alias-bg-layer-2);border:1px dashed var(--dsw-alias-border-l1)}',
      '.dshch-empty-title{font-size:11.5px;color:var(--dsw-alias-label-secondary)}',
      '.dshch-empty-hint{font-size:10.5px;color:var(--dsw-alias-label-tertiary)}',
      '.dshch-section{display:flex;flex-direction:column;gap:5px;min-width:0;flex:0 0 auto}',
      '.dshch-section.is-grow{flex:1 1 auto;min-height:0}',
      '.dshch-section.is-thought{flex:0 0 auto}',
      '.dshch-field{flex:1 1 0;min-height:60px;width:100%;display:block;border-radius:10px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1)}',
      '.dshch-thought-slot{display:flex;flex-direction:column;gap:4px;flex:0 0 auto;height:clamp(72px,15vh,104px);min-height:0}',
      '',
      '.dshch-ticker{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;line-height:1.4;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.78}',
      '.dshch-section-head{display:flex;align-items:baseline;gap:7px}',
      '.dshch-label{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}',
      '.dshch-count{font-size:10px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}',
      '.dshch-rate{margin-left:auto;font-size:10px;font-variant-numeric:tabular-nums}',
      '.dshch-thought{max-height:none;min-height:0;flex:1 1 auto;overflow:auto;padding:8px 9px;border-radius:10px;',
      'background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);',
      'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:1.55;',
      'color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word;',
      'scrollbar-width:thin;overscroll-behavior:contain;pointer-events:auto}',
      '.dshch-thought:focus-visible{outline:2px solid var(--dsw-focus-ring-color);outline-offset:1px}',
      '.dshch-folded{font-size:10px;color:var(--dsw-alias-label-tertiary);opacity:.8;margin-bottom:4px;padding-right:50px;',
      'border-bottom:1px dashed var(--dsw-alias-border-l1);padding-bottom:3px}',
      '.dshch-caret{display:inline-block;width:6px;height:11px;margin-left:2px;vertical-align:-1px;',
      'background:var(--dsw-alias-brand-primary);opacity:.75;animation:dshch-blink 1.1s steps(1) infinite}',
      '@keyframes dshch-blink{50%{opacity:0}}',
      '.dshch-muted{font-size:11px;color:var(--dsw-alias-label-tertiary);padding:1px 0}',
      '.dshch-tools{display:flex;flex-direction:column;gap:4px;flex:1 1 auto;min-height:0;overflow-y:auto;scrollbar-width:thin}',
      '.dshch-tool{display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:8px;',
      'background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);min-width:0}',
      '.dshch-tool.is-done{opacity:.6}',
      '.dshch-tool-glyph{font-size:10px;color:var(--dsw-alias-state-warn-primary);flex:0 0 auto}',
      '.dshch-tool.is-done .dshch-tool-glyph{color:var(--dsw-alias-state-success-primary)}',
      '.dshch-tool-name{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;',
      'color:var(--dsw-alias-label-primary);flex:0 0 auto;max-width:42%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dshch-tool-args{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10.5px;',
      'color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}',
      '.dshch-caps{display:flex;flex-direction:column;gap:4px;flex:0 0 auto;height:64px;overflow:hidden}',
      '.dshch-cap-row{display:flex;align-items:center;gap:6px;min-width:0;height:18px}',
      '.dshch-cap-label{flex:0 0 auto;width:32px;font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}',
      '.dshch-cap-chips{flex:1 1 auto;display:flex;gap:4px;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}',
      '.dshch-cap-chips::-webkit-scrollbar{display:none}',
      '.dshch-chip{flex:0 0 auto;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:1px 6px;border-radius:6px;font-size:10px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1)}',
      '.dshch-cap-none{font-size:10px;color:var(--dsw-alias-label-tertiary);opacity:.6}',
      '.dshch-steps{display:flex;flex-direction:column;gap:3px}',
      '.dshch-step{display:flex;align-items:center;gap:8px;min-width:0}',
      '.dshch-step-id{font-size:10px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;flex:0 0 auto;width:38px}',
      '.dshch-step-bar{flex:1 1 auto;height:5px;display:flex;gap:1px;border-radius:3px;overflow:hidden;background:var(--dsw-alias-bg-layer-2)}',
      '.dshch-step-bar i{display:block;flex-basis:0;min-width:0}',
      '.dshch-step-bar i.is-reasoning{background:var(--dsw-alias-brand-primary);opacity:.85}',
      '.dshch-step-bar i.is-text{background:var(--dsw-alias-state-success-primary);opacity:.7}',
      '.dshch-step-bar i.is-tool{background:var(--dsw-alias-state-warn-primary);opacity:.75}',
      '.dshch-step-meta{font-size:10px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;flex:0 0 auto}',
      '.dshch-legend{display:flex;gap:10px;font-size:9.5px;color:var(--dsw-alias-label-tertiary);opacity:.85}',
      '.dshch-legend i{display:inline-block;width:6px;height:6px;border-radius:2px;margin-right:4px;vertical-align:1px}',
      '.dshch-legend i.is-reasoning{background:var(--dsw-alias-brand-primary);opacity:.85}',
      '.dshch-legend i.is-text{background:var(--dsw-alias-state-success-primary);opacity:.7}',
      '.dshch-legend i.is-tool{background:var(--dsw-alias-state-warn-primary);opacity:.75}',
      '.dshch-foot{display:flex;flex-wrap:wrap;gap:9px;font-size:10px;color:var(--dsw-alias-label-tertiary);',
      'font-variant-numeric:tabular-nums;border-top:1px solid var(--dsw-alias-border-l1);padding-top:7px}',
      '.dshch-warn{color:var(--dsw-alias-state-warn-primary)}',
      '.dshch.is-collapsed{width:auto}',
      '.dshch-pill{pointer-events:auto;position:relative;display:inline-flex;align-items:center;justify-content:center;',
      'width:46px;height:46px;border-radius:50%;border:1px solid var(--dsw-alias-border-l2);',
      'background:color-mix(in srgb,var(--dsw-alias-bg-overlay) 82%,transparent);backdrop-filter:blur(14px);',
      '-webkit-backdrop-filter:blur(14px);box-shadow:0 10px 28px rgba(0,0,0,.24);cursor:pointer;padding:0;',
      'color:var(--dsw-alias-label-secondary)}',
      '.dshch-pill:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dshch-pill:focus-visible{outline:2px solid var(--dsw-focus-ring-color);outline-offset:2px}',
      '.dshch-pill-ring{position:absolute;inset:3px;border-radius:50%;border:2px solid transparent;',
      'border-top-color:var(--dsw-alias-brand-primary);opacity:.9}',
      '.dshch-pill.is-live .dshch-pill-ring{animation:dshch-spin 1.4s linear infinite}',
      '@keyframes dshch-spin{to{transform:rotate(360deg)}}',
      '.dshch-pill-text{font-size:10px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}',
      '@media (max-width:720px){.dshch{right:12px;top:112px;width:calc(100vw - 24px)}}',
      '.dshch-orb{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}',
      '.dshch-water{transform-box:fill-box}',
      '.dshch-drift{transform:translateX(0)}',
      '.dshch-drift.is-live{animation:dshch-orb-drift 2.8s linear infinite}',
      '@keyframes dshch-orb-drift{from{transform:translateX(0)}to{transform:translateX(-64px)}}',
      '.dshch-pill{overflow:hidden}',
      '.dshch-pill-text{position:relative;z-index:1;font-size:10px;font-weight:600;color:var(--dsw-alias-label-primary);text-shadow:0 1px 3px rgba(0,0,0,.5)}',
      '.dshch-backdrop{position:fixed;inset:0;z-index:1;background:transparent;pointer-events:auto}',
      '.dshch-menu{position:fixed;z-index:2;min-width:180px;display:flex;flex-direction:column;padding:5px;border-radius:11px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);box-shadow:0 16px 40px rgba(0,0,0,.32);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);pointer-events:auto}',
      '.dshch-menu-item{appearance:none;border:0;background:transparent;text-align:left;padding:7px 9px;border-radius:7px;font-size:12px;color:var(--dsw-alias-label-primary);cursor:pointer;font-family:inherit}',
      '.dshch-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dshch-menu-item:focus-visible{outline:2px solid var(--dsw-focus-ring-color);outline-offset:-1px}',
      '.dshch-menu-item.is-danger{color:var(--dsw-alias-state-error-primary)}',
      '.dshch-menu-sep{height:1px;margin:4px 6px;background:var(--dsw-alias-border-l1)}',
      '@media (prefers-reduced-motion:reduce){.dshch-dot.is-live,.dshch-pill.is-live .dshch-pill-ring,',
      '.dshch-caret{animation:none}}',
    ].join('');

    /* ------------------------------------------------------------------ *
     * Plugin
     * ------------------------------------------------------------------ */
    return {
      inject: ['slots'],
      apply(ctx) {
        const locale = ctx.get('locale');
        if (locale && typeof locale.register === 'function') {
          ctx.effect(() => {
            const disposers = [];
            try {
              disposers.push(locale.register('cognition-hud', 'en', EN));
              disposers.push(locale.register('cognition-hud', 'zh', ZH));
              disposers.push(locale.register('cognition-hud', 'zh-CN', ZH));
            } catch (error) {
              console.error(error);
            }
            try {
              t = locale.bind('cognition-hud');
            } catch (error) {
              console.error(error);
            }
            let offChange = null;
            if (typeof locale.subscribe === 'function') {
              offChange = locale.subscribe(() => touch());
            }
            return () => {
              offChange && offChange();
              disposers.forEach(dispose => {
                try {
                  dispose();
                } catch (error) {
                  console.error(error);
                }
              });
            };
          });
        }

        api.sessions = ctx.get('sessions') || null;

        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            {
              name: 'shell.overlay',
              id: 'cognition-hud',
              order: 40,
              label: () => t('title'),
            },
            CognitionHud,
          ),
        );

        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register(
            {
              name: 'conversation.composer.dock',
              id: 'cognition-hud.bridge',
              order: 90,
              label: () => t('title'),
            },
            SessionBridge,
          ),
        );

        ctx.effect(() => () => detach());
      },
    };
  },
});

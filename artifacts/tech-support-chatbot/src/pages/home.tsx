import { useEffect, useMemo, useRef, useState } from 'react';
import type { SupportChatMessage } from '@workspace/api-client-react';
import { useHealthCheck } from '@workspace/api-client-react';
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Command,
  Copy,
  LifeBuoy,
  Menu,
  MessageSquarePlus,
  Monitor,
  MoreHorizontal,
  Network,
  PanelRight,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  Wifi,
  X,
} from 'lucide-react';

type Conversation = {
  id: string;
  title: string;
  preview: string;
  updated: string;
  messages: SupportChatMessage[];
};

type StreamEvent = {
  content?: string;
  done?: boolean;
  error?: string;
};

const starters = [
  { icon: Wifi, label: 'My Wi-Fi keeps dropping', detail: 'Connection / network' },
  { icon: Monitor, label: 'An app is frozen or crashing', detail: 'Software / app' },
  { icon: ShieldCheck, label: 'I cannot sign in to my account', detail: 'Account / access' },
  { icon: Settings2, label: 'My second monitor is not detected', detail: 'Device / hardware' },
];

const initialMessages: SupportChatMessage[] = [];

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

function MessageText({ content }: { content: string }) {
  const blocks = content.split(/\n+/).filter(Boolean);
  return (
    <div className="message-copy text-[14px] leading-[1.65] text-[#304457]">
      {blocks.map((block, index) => {
        const numbered = block.match(/^(\d+)[.)]\s+(.*)$/);
        if (numbered) {
          return (
            <div className="flex gap-3 py-1" key={`${block}-${index}`}>
              <span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e6f1f1] font-mono text-[10px] font-bold text-[#237b80]">
                {numbered[1]}
              </span>
              <span>{numbered[2]}</span>
            </div>
          );
        }
        return <p key={`${block}-${index}`}>{block}</p>;
      })}
    </div>
  );
}

function AssistantMark({ small = false }: { small?: boolean }) {
  return (
    <div className={`relative flex shrink-0 items-center justify-center rounded-[10px] bg-[#e2f0ee] ${small ? 'h-7 w-7' : 'h-9 w-9'}`}>
      <span className={`absolute rounded-full bg-[#f27b5f] ${small ? 'h-1.5 w-1.5' : 'h-2 w-2'}`} />
      <span className={`absolute rotate-45 rounded-[2px] border-[1.5px] border-[#267d82] ${small ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]'}`} />
      <span className={`absolute -rotate-45 rounded-[2px] border-[1.5px] border-[#267d82] ${small ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]'}`} />
    </div>
  );
}

function Sidebar({
  conversations,
  activeId,
  onNew,
  onSelect,
  onClose,
}: {
  conversations: Conversation[];
  activeId: string;
  onNew: () => void;
  onSelect: (id: string) => void;
  onClose?: () => void;
}) {
  return (
    <aside className="flex h-full w-[292px] shrink-0 flex-col border-r border-[#dbe4e6] bg-[#f4f8f7]">
      <div className="flex h-[76px] items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <AssistantMark />
          <div>
            <div className="font-display text-[19px] font-semibold tracking-[-0.04em] text-[#1f3548]">Relay</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#6f858e]">Support desk</div>
          </div>
        </div>
        {onClose && (
          <button data-testid="button-close-sidebar" onClick={onClose} className="rounded-lg p-2 text-[#6f858e] hover:bg-[#e6f0ee] md:hidden" aria-label="Close menu">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="px-4">
        <button
          data-testid="button-new-conversation"
          onClick={onNew}
          className="group flex w-full items-center justify-between rounded-[10px] bg-[#267d82] px-4 py-3 text-left text-[13px] font-semibold text-white shadow-[0_5px_14px_rgba(38,125,130,.16)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <span className="flex items-center gap-2.5"><MessageSquarePlus size={17} strokeWidth={1.8} />New support thread</span>
          <span className="font-mono text-[10px] opacity-60">⌘ N</span>
        </button>
      </div>

      <div className="mt-8 px-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#81949a]">Recent threads</span>
          <button data-testid="button-more-conversations" className="rounded p-1 text-[#81949a] hover:bg-[#e5eeee]" aria-label="More conversation options"><MoreHorizontal size={15} /></button>
        </div>
        <div className="space-y-1.5">
          {conversations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#cbdadb] px-3 py-4 text-[12px] leading-5 text-[#81949a]">Your resolved threads will appear here.</div>
          ) : conversations.map((item) => (
            <button
              data-testid={`button-conversation-${item.id}`}
              key={item.id}
              onClick={() => { onSelect(item.id); onClose?.(); }}
              className={`w-full rounded-[9px] border px-3 py-3 text-left transition-colors ${activeId === item.id ? 'border-[#c5ddda] bg-white shadow-[0_2px_7px_rgba(38,74,85,.05)]' : 'border-transparent hover:bg-[#eaf2f0]'}`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className={`truncate text-[12px] font-semibold ${activeId === item.id ? 'text-[#267d82]' : 'text-[#3b5260]'}`}>{item.title}</span>
                <span className="shrink-0 font-mono text-[9px] text-[#98a8ac]">{item.updated}</span>
              </div>
              <p className="truncate text-[11px] text-[#809299]">{item.preview}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto border-t border-[#dbe4e6] px-5 py-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dbe9e7] text-[11px] font-bold text-[#267d82]">AR</div>
          <div className="min-w-0">
            <div className="truncate text-[12px] font-semibold text-[#3b5260]">Alex Rivera</div>
            <div className="font-mono text-[9px] uppercase tracking-[.08em] text-[#91a2a7]">Personal workspace</div>
          </div>
          <button data-testid="button-profile-options" className="ml-auto rounded p-1 text-[#81949a] hover:bg-[#e5eeee]" aria-label="Profile options"><MoreHorizontal size={15} /></button>
        </div>
        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[.11em] text-[#8a9da1]">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#4cac91]" />Relay is ready</span>
          <button data-testid="button-help" className="flex items-center gap-1 hover:text-[#267d82]"><CircleHelp size={13} />Help</button>
        </div>
      </div>
    </aside>
  );
}

function ContextPanel({ onEscalate, escalated }: { onEscalate: () => void; escalated: boolean }) {
  return (
    <aside className="hidden w-[282px] shrink-0 border-l border-[#dbe4e6] bg-[#f8faf8] xl:flex xl:flex-col">
      <div className="flex h-[76px] items-center justify-between border-b border-[#e3eaea] px-6">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[.15em] text-[#71858d]">Thread context</div>
          <div className="mt-1 text-[11px] text-[#a0adb0]">Useful details, kept close</div>
        </div>
        <PanelRight size={17} className="text-[#91a4a6]" />
      </div>
      <div className="scrollbar-subtle flex-1 overflow-y-auto px-6 py-6">
        <div className="rounded-[11px] border border-[#d9e7e3] bg-[#eef6f3] p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold text-[#347477]"><Sparkles size={14} /> Relay listens for</div>
          <p className="text-[12px] leading-5 text-[#60777a]">Your operating system, device model, app name, and exact error wording. Specifics help us skip the guesswork.</p>
        </div>

        <div className="mt-7">
          <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[.15em] text-[#83969b]">What to include</div>
          <div className="space-y-3">
            {[
              ['01', 'Device', 'Laptop, phone, router, or accessory'],
              ['02', 'System', 'Windows 11, macOS 14, iOS, Android'],
              ['03', 'Evidence', 'Error codes, timing, and what changed'],
            ].map(([number, title, detail]) => (
              <div key={number} className="flex gap-3">
                <span className="font-mono text-[10px] text-[#ef805f]">{number}</span>
                <div><div className="text-[12px] font-semibold text-[#475d67]">{title}</div><div className="mt-0.5 text-[11px] leading-4 text-[#8a9b9e]">{detail}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-[#e1e8e7] pt-6">
          <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[.15em] text-[#83969b]"><Clock3 size={13} /> Service note</div>
          <p className="text-[11px] leading-5 text-[#8a9b9e]">Relay can guide common fixes. It will tell you when a human needs to take the next step.</p>
        </div>
      </div>
      <div className="border-t border-[#e3eaea] p-5">
        {escalated ? (
          <div data-testid="status-escalated" className="flex items-start gap-2.5 rounded-[10px] border border-[#b9d8d0] bg-[#edf7f2] p-3 text-[11px] leading-4 text-[#47726e]"><Check size={15} className="mt-0.5 shrink-0 text-[#3e9a83]" /><span><strong className="font-semibold">Ready for tier 2.</strong><br />A support specialist will follow up by email.</span></div>
        ) : (
          <button data-testid="button-escalate" onClick={onEscalate} className="flex w-full items-center justify-between rounded-[9px] border border-[#d8e3e2] bg-white px-3.5 py-3 text-left text-[11px] font-semibold text-[#536971] transition-colors hover:border-[#b6cecb] hover:text-[#267d82]">
            <span className="flex items-center gap-2"><LifeBuoy size={15} />Still stuck? Talk to support</span><ArrowUpRight size={14} />
          </button>
        )}
      </div>
    </aside>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<SupportChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState('');
  const [escalated, setEscalated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeId, setActiveId] = useState('new');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { data: health, isLoading: healthLoading, isError: healthError } = useHealthCheck();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const online = !healthError && (healthLoading || health?.status === 'ok' || Boolean(health));
  const suggestedTitle = useMemo(() => {
    const firstUser = messages.find((message) => message.role === 'user');
    if (!firstUser) return 'New support thread';
    return firstUser.content.length > 31 ? `${firstUser.content.slice(0, 31)}…` : firstUser.content;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const newConversation = () => {
    abortRef.current?.abort();
    setMessages([]);
    setDraft('');
    setStreaming(false);
    setStreamError('');
    setEscalated(false);
    setActiveId('new');
    setSidebarOpen(false);
  };

  const copyMessage = async (content: string, index: number) => {
    await navigator.clipboard?.writeText(content);
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 1400);
  };

  const sendMessage = async (value = draft) => {
    const content = value.trim();
    if (!content || streaming) return;
    const userMessage: SupportChatMessage = { role: 'user', content };
    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, { role: 'assistant', content: '' }]);
    setDraft('');
    setStreaming(true);
    setStreamError('');
    setActiveId('new');
    const controller = new AbortController();
    abortRef.current = controller;
    let assistantContent = '';

    try {
      const response = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        credentials: 'include',
        body: JSON.stringify({ messages: nextMessages }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error('Relay could not reach the support service.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const consume = (raw: string) => {
        buffer += raw;
        const events = buffer.split(/\n\n/);
        buffer = events.pop() ?? '';
        for (const event of events) {
          const line = event.split('\n').find((entry) => entry.startsWith('data:'));
          if (!line) continue;
          try {
            const parsed = JSON.parse(line.slice(5).trim()) as StreamEvent;
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.content) {
              assistantContent += parsed.content;
              setMessages([...nextMessages, { role: 'assistant', content: assistantContent }]);
            }
          } catch (parseError) {
            if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') throw parseError;
          }
        }
      };
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        consume(decoder.decode(chunk, { stream: true }));
      }
      consume(decoder.decode());
      if (!assistantContent) throw new Error('Relay returned an empty response. Please try again.');
      const threadId = activeId === 'new' ? `thread-${Date.now()}` : activeId;
      const savedMessages = [...nextMessages, { role: 'assistant' as const, content: assistantContent }];
      setActiveId(threadId);
      setConversations((current) => {
        const savedThread = {
          id: threadId,
          title: suggestedTitle === 'New support thread' ? (content.length > 31 ? `${content.slice(0, 31)}…` : content) : suggestedTitle,
          preview: assistantContent.slice(0, 54),
          updated: 'Just now',
          messages: savedMessages,
        };
        const withoutCurrent = current.filter((item) => item.id !== threadId);
        return [savedThread, ...withoutCurrent].slice(0, 5);
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setMessages(nextMessages);
        return;
      }
      setStreamError(error instanceof Error ? error.message : 'Something interrupted this support thread.');
      setMessages(nextMessages);
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const selectConversation = (id: string) => {
    if (id === activeId) return;
    const selected = conversations.find((item) => item.id === id);
    setActiveId(id);
    setMessages(selected?.messages ?? []);
    setStreamError('');
    setEscalated(false);
  };

  return (
    <div className="noise flex min-h-[100dvh] overflow-hidden bg-[#fdfcf9] text-[#1f3548]">
      <div className={`fixed inset-0 z-40 bg-[#213b47]/25 transition-opacity md:hidden ${sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={() => setSidebarOpen(false)} />
      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:relative md:z-auto md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar conversations={conversations} activeId={activeId} onNew={newConversation} onSelect={selectConversation} onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-[#e0e8e8] bg-[#fdfcf9]/95 px-5 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <button data-testid="button-open-sidebar" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-[#617a83] hover:bg-[#edf3f1] md:hidden" aria-label="Open conversations"><Menu size={19} /></button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-[16px] font-semibold tracking-[-.03em] text-[#274153]">Your support desk</h1>
                <span className="hidden rounded-full border border-[#d5e7e3] bg-[#edf7f3] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[.1em] text-[#438b7d] sm:inline-flex">Private thread</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[.11em] text-[#8b9da1]">
                {healthLoading ? <><span className="h-1.5 w-1.5 rounded-full bg-[#e5a55e] pulse-dot" />Checking relay</> : online ? <><span className="h-1.5 w-1.5 rounded-full bg-[#4cac91]" />Relay online · Local guide</> : <><span className="h-1.5 w-1.5 rounded-full bg-[#d65c55]" />Relay needs attention</>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button data-testid="button-refresh-health" className="hidden rounded-lg p-2 text-[#81949a] transition-colors hover:bg-[#edf3f1] hover:text-[#267d82] sm:block" onClick={() => window.location.reload()} aria-label="Refresh relay status"><RefreshCw size={16} /></button>
            <button data-testid="button-header-help" className="hidden items-center gap-2 rounded-lg border border-[#dce6e5] bg-white px-3 py-2 text-[11px] font-semibold text-[#60767d] hover:border-[#bdd3d0] sm:flex"><CircleHelp size={14} />Help center</button>
            <button data-testid="button-header-menu" className="rounded-lg p-2 text-[#81949a] hover:bg-[#edf3f1]" aria-label="More options"><MoreHorizontal size={18} /></button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-subtle flex-1 overflow-y-auto px-4 pb-36 pt-8 sm:px-8 lg:px-14">
            <div className="mx-auto w-full max-w-[760px]">
              {messages.length === 0 ? (
                <div className="relay-in flex min-h-[calc(100dvh-180px)] flex-col justify-center pb-10">
                  <div className="mb-8 flex items-start justify-between">
                    <div>
                      <div className="mb-5 flex items-center gap-3">
                        <AssistantMark />
                        <div className="font-mono text-[10px] uppercase tracking-[.14em] text-[#769096]">Relay / ready to listen</div>
                      </div>
                      <h2 className="max-w-[580px] font-display text-[clamp(2.4rem,5vw,4.5rem)] font-semibold leading-[.98] tracking-[-.075em] text-[#203a4b]">Let’s get you<br /><span className="text-[#267d82]">unstuck.</span></h2>
                      <p className="mt-6 max-w-[470px] text-[15px] leading-7 text-[#71858c]">Tell me what is misbehaving. Include the device, operating system, app, and exact error if you have them.</p>
                    </div>
                    <div className="hidden pt-1 text-right sm:block">
                      <div className="font-mono text-[10px] uppercase tracking-[.14em] text-[#a1adaf]">Session</div>
                      <div className="mt-1 font-mono text-[11px] text-[#658086]"># RLY-{new Date().getFullYear()}-041</div>
                    </div>
                  </div>
                  <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[.15em] text-[#91a0a3]"><Command size={13} />Start with a common issue</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {starters.map(({ icon: Icon, label, detail }, index) => (
                      <button
                        data-testid={`button-starter-${index}`}
                        key={label}
                        onClick={() => sendMessage(label)}
                        className="group flex items-center gap-3 rounded-[11px] border border-[#dde7e6] bg-white px-4 py-3.5 text-left shadow-[0_2px_5px_rgba(31,54,74,.025)] transition-all hover:-translate-y-0.5 hover:border-[#b9d6d1] hover:shadow-[0_8px_20px_rgba(31,54,74,.07)]"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef5f3] text-[#38888a] transition-colors group-hover:bg-[#e1efeb]"><Icon size={16} strokeWidth={1.8} /></span>
                        <span className="min-w-0"><span className="block text-[12px] font-semibold text-[#435966]">{label}</span><span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[.08em] text-[#9aa9aa]">{detail}</span></span>
                        <ChevronRight size={14} className="ml-auto shrink-0 text-[#b2c0c0] transition-transform group-hover:translate-x-0.5 group-hover:text-[#39878a]" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-7">
                  <div className="relay-in flex items-center gap-3 border-b border-[#e7eceb] pb-5">
                    <span className="font-mono text-[10px] uppercase tracking-[.14em] text-[#91a0a3]">Thread started</span><span className="h-1 w-1 rounded-full bg-[#d4a47b]" /><span className="font-mono text-[10px] text-[#a5b0b1]">{formatTime(new Date().toISOString())}</span>
                  </div>
                  {messages.map((message, index) => (
                    <div data-testid={`message-${message.role}-${index}`} key={`${message.role}-${index}`} className={`relay-in relay-delay-${Math.min(index + 1, 3)} flex gap-3.5 ${message.role === 'user' ? 'justify-end' : 'items-start'}`}>
                      {message.role === 'assistant' && <AssistantMark small />}
                      <div className={`max-w-[min(620px,90%)] ${message.role === 'user' ? 'order-first' : ''}`}>
                        {message.role === 'assistant' ? (
                          <div className="rounded-[4px_14px_14px_14px] border border-[#dce8e5] bg-white px-4 py-3.5 shadow-[0_3px_12px_rgba(31,54,74,.035)]">
                            {message.content ? <MessageText content={message.content} /> : <div data-testid="status-streaming" className="flex items-center gap-1.5 py-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#267d82] pulse-dot" /><span className="h-1.5 w-1.5 rounded-full bg-[#267d82] pulse-dot [animation-delay:.15s]" /><span className="h-1.5 w-1.5 rounded-full bg-[#267d82] pulse-dot [animation-delay:.3s]" /><span className="ml-2 font-mono text-[10px] uppercase tracking-[.1em] text-[#91a2a4]">Relay is thinking</span></div>}
                          </div>
                        ) : (
                          <div className="rounded-[14px_4px_14px_14px] bg-[#267d82] px-4 py-3.5 text-[14px] leading-6 text-white shadow-[0_5px_14px_rgba(38,125,130,.12)]">{message.content}</div>
                        )}
                        {message.role === 'assistant' && message.content && (
                          <div className="mt-2 flex items-center gap-2 pl-1">
                            <button data-testid={`button-copy-message-${index}`} onClick={() => copyMessage(message.content, index)} className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[.1em] text-[#9aabad] hover:text-[#267d82]">{copiedIndex === index ? <Check size={12} /> : <Copy size={12} />}{copiedIndex === index ? 'Copied' : 'Copy'}</button>
                            <span className="text-[#cad3d2]">·</span><span className="font-mono text-[9px] uppercase tracking-[.1em] text-[#a7b3b4]">Support guidance</span>
                          </div>
                        )}
                      </div>
                      {message.role === 'user' && <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f7e7de] font-mono text-[9px] font-bold text-[#a35e46]">AR</div>}
                    </div>
                  ))}
                  {streamError && (
                    <div data-testid="status-stream-error" className="relay-in flex items-start gap-3 rounded-[11px] border border-[#efd1c9] bg-[#fff7f3] p-4 text-[12px] leading-5 text-[#9b5d4c]">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" /><div><strong className="font-semibold">The relay was interrupted.</strong><div>{streamError}</div><button data-testid="button-retry-message" onClick={() => sendMessage(messages[messages.length - 1]?.role === 'user' ? messages[messages.length - 1].content : '')} className="mt-2 font-semibold underline underline-offset-2">Try that again</button></div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#fdfcf9] via-[#fdfcf9]/95 to-transparent px-4 pb-5 pt-10 sm:px-8 lg:px-14">
            <div className="pointer-events-auto mx-auto max-w-[760px]">
              <div className="relative rounded-[14px] border border-[#ccdedd] bg-white p-2 shadow-[0_10px_30px_rgba(31,54,74,.11)] transition-colors focus-within:border-[#75aca7]">
                <textarea
                  data-testid="input-support-message"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }}
                  disabled={streaming}
                  rows={2}
                  placeholder={streaming ? 'Relay is writing a clear next step…' : 'Describe what went wrong…'}
                  className="w-full resize-none border-0 bg-transparent px-3 py-2 text-[14px] leading-6 text-[#304657] outline-none placeholder:text-[#a5b2b3] disabled:opacity-60"
                />
                <div className="flex items-center justify-between px-2 pb-1">
                  <span className="font-mono text-[9px] uppercase tracking-[.1em] text-[#a2b0b1]">Shift + Enter for a new line</span>
                  {streaming ? (
                    <button data-testid="button-stop-stream" onClick={() => abortRef.current?.abort()} className="flex h-8 items-center gap-2 rounded-[9px] bg-[#f4e2dc] px-3 text-[11px] font-semibold text-[#a45f4a] hover:bg-[#f1d7cf]"><Square size={12} fill="currentColor" />Stop</button>
                  ) : (
                    <button data-testid="button-send-message" disabled={!draft.trim()} onClick={() => void sendMessage()} className="flex h-8 items-center gap-2 rounded-[9px] bg-[#267d82] px-3 text-[11px] font-semibold text-white transition-all hover:bg-[#206e73] disabled:cursor-not-allowed disabled:opacity-35"><Send size={13} />Send</button>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5 text-center font-mono text-[9px] uppercase tracking-[.1em] text-[#a6b1b2]"><ShieldCheck size={11} />Do not share passwords or payment details</div>
            </div>
          </div>
        </div>
      </main>
      <ContextPanel onEscalate={() => setEscalated(true)} escalated={escalated} />
    </div>
  );
}

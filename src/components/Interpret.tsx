'use client';

import React, { useEffect, useMemo, useState } from 'react';

type ApiTerm = { term?: string; meaning?: string };
type ApiPayload = { summary?: string; analogy?: string; key_terms?: ApiTerm[] };

type Result = { simple: string; analogy: string; bullets: string[] };

function getSelectionRect(): DOMRect | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  return rect?.width || rect?.height ? rect : null;
}

export default function Interpret() {
  const [showBubble, setShowBubble] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [tab, setTab] = useState<'simple' | 'analogy' | 'bullets'>('simple');

  // Show tiny bubble when user selects small-ish text
  useEffect(() => {
    const onMouseUp = () => {
      const sel = window.getSelection();
      const selected = sel?.toString().trim() ?? '';
      const rect = getSelectionRect();
      const okLen = selected.length >= 2 && selected.length <= 240;
      if (okLen && rect) {
        setText(selected);
        setAnchor({ x: rect.left + rect.width / 2, y: Math.max(8, rect.top - 8) });
        setShowBubble(true);
      } else {
        setShowBubble(false);
      }
    };
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, []);

  const ask = async () => {
    if (!text) return;
    setOpen(true);
    setLoading(true);
    setRes(null);
    try {
      const contextEl = document.querySelector('[data-interpret-context]');
      const context = contextEl?.textContent?.slice(0, 400);

      const r = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, context }),
      });

      const json = await r.json();
      // Server returns: { ok: true, data: { summary, key_terms, analogy } }
      const payload: ApiPayload = (json?.data ?? {}) as ApiPayload;

      const bullets = Array.isArray(payload.key_terms)
        ? payload.key_terms
            .map((t) =>
              t?.term && t?.meaning ? `${t.term}: ${t.meaning}` : t?.term || t?.meaning || ''
            )
            .filter(Boolean)
        : [];

      setRes({
        simple: payload.summary || 'No summary available.',
        analogy: payload.analogy || '',
        bullets,
      });
    } catch (e) {
      setRes({
        simple: 'Sorry, I could not interpret that right now.',
        analogy: '',
        bullets: [],
      });
    } finally {
      setLoading(false);
      setShowBubble(false);
    }
  };

  const copy = async () => {
    if (!res) return;
    const block =
      tab === 'simple'
        ? res.simple
        : tab === 'analogy'
        ? (res.analogy ? `Analogy: ${res.analogy}` : 'No analogy available.')
        : (res.bullets.length ? res.bullets : ['No key points available.']).map((b) => `• ${b}`).join('\n');
    await navigator.clipboard.writeText(block);
  };

  const styleBubble: React.CSSProperties = useMemo(() => {
    if (!anchor) return { display: 'none' };
    return {
      position: 'fixed',
      left: anchor.x,
      top: anchor.y,
      transform: 'translate(-50%, -100%)',
      zIndex: 60,
    };
  }, [anchor]);

  const stylePopover: React.CSSProperties = useMemo(() => {
    if (!anchor) return { display: 'none' };
    return {
      position: 'fixed',
      left: Math.min(window.innerWidth - 24, Math.max(24, anchor.x)),
      top: anchor.y + 10,
      transform: 'translate(-50%, 0)',
      zIndex: 60,
      width: 'min(560px, calc(100vw - 32px))',
    };
  }, [anchor]);

  return (
    <>
      {showBubble && (
        <button
          onClick={ask}
          style={styleBubble}
          className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/90 shadow-md backdrop-blur hover:bg-white/20"
        >
          Explain
        </button>
      )}

      {open && (
        <div
          style={stylePopover}
          className="rounded-2xl border border-white/10 bg-zinc-900/90 shadow-2xl backdrop-blur-xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="truncate text-sm text-white/70">“{text}”</div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTab('simple')}
                className={`px-2 py-1 text-xs rounded-lg ${tab === 'simple' ? 'bg-white/15' : 'hover:bg-white/10'} text-white/80`}
              >
                Simple
              </button>
              <button
                onClick={() => setTab('analogy')}
                className={`px-2 py-1 text-xs rounded-lg ${tab === 'analogy' ? 'bg-white/15' : 'hover:bg-white/10'} text-white/80`}
              >
                Analogy
              </button>
              <button
                onClick={() => setTab('bullets')}
                className={`px-2 py-1 text-xs rounded-lg ${tab === 'bullets' ? 'bg-white/15' : 'hover:bg-white/10'} text-white/80`}
              >
                Key points
              </button>
            </div>
          </div>

          <div className="max-h-[50vh] overflow-auto px-4 py-3">
            {loading && (
              <div className="animate-pulse space-y-3">
                <div className="h-3 w-2/3 rounded bg-white/10" />
                <div className="h-3 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-white/10" />
              </div>
            )}

            {!loading && res && (
              <>
                {tab === 'simple' && <p className="leading-relaxed text-zinc-100">{res.simple}</p>}

                {tab === 'analogy' && (
                  <p className="italic text-zinc-200">
                    {res.analogy || 'No analogy available.'}
                  </p>
                )}

                {tab === 'bullets' && (
                  <ul className="list-disc pl-5 space-y-1 text-zinc-100">
                    {(res.bullets.length ? res.bullets : ['No key points available.']).map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <div className="text-[11px] text-white/40">
              Tip: press <kbd className="px-1 py-0.5 bg-white/10 rounded">Esc</kbd> to close
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={ask}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
              >
                Regenerate
              </button>
              <button
                onClick={copy}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
              >
                Copy
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50"
          onMouseDown={() => setOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          tabIndex={-1}
        />
      )}
    </>
  );
}

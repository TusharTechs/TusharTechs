#!/usr/bin/env python3
"""Generates every SVG used by the profile README into ../assets.

Edit the data blocks below (WINS, PROJECTS, ARSENAL, STATS) and re-run:
    python3 scripts/build_svgs.py
"""
import math
import random
from pathlib import Path
from xml.sax.saxutils import escape as esc

OUT = Path(__file__).resolve().parent.parent / "assets"
OUT.mkdir(exist_ok=True)

FONT = "'Segoe UI', -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif"
MONO = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace"
BG0, BG1 = "#04050d", "#0b1030"

# --------------------------------------------------------------------------- data
STATS = [
    ("5", "hackathon wins in 2026", "2 grand prizes"),
    ("50+", "AI products shipped", "July to November 2026"),
    ("15.7K", "builders in the field", "IBM Bob 2.0, 1st place"),
    ("1", "live paid AI SaaS", "plus an App Store app"),
]

WINS = [
    ("GRAND PRIZE", "gold", "DevNetwork [API + Cloud + AI] Hackathon 2026",
     "Overall Winner at API World, built solo", "315 submissions"),
    ("GRAND PRIZE", "gold", "Hack Apertus 2026 · Swiss AI",
     "Online Track", "919 builders · 80 countries"),
    ("1ST PLACE", "gold", "IBM Bob 2.0 Hackathon · lablab",
     "$12K prize pool", "15,727 participants"),
    ("2ND PLACE", "silver", "Google Cloud · Build with AI: Code for Communities",
     "Track 5 · GDG India × Hack2skill · ₹10L pool", "nationwide"),
    ("5TH PLACE", "bronze", "Hack Raptors", "", ""),
    ("SPECIAL 26", "violet", "GoKwik Special 26 Award",
     "Company-wide quarterly award for top performers", "at work"),
]

PROJECTS = [
    ("worldsmith", "WorldSmith", "#a78bfa", "LIVE SaaS",
     ["One sentence in. A finished film and an",
      "8-platform campaign out, with every frame QC'd."],
     ["Gemini", "Veo 3.1", "Vertex AI", "Next.js"]),
    ("mutiny", "Mutiny", "#34d399", "LIVE",
     ["Runs old and new code on the same inputs and",
      "returns the one where they disagree."],
     ["Nemotron", "Nebius Sandboxes", "Tavily"]),
    ("window-sticker", "Window Sticker", "#fbbf24", "LIVE",
     ["Crash-test ratings for AI agents: 576 runs in",
      "throwaway microVMs, with real confidence intervals."],
     ["Python", "Vultr microVMs", "Evals"]),
    ("buyable", "Buyable", "#f472b6", "LIVE",
     ["Can a screen reader or an AI agent actually",
      "check out? Finds the blocker, patches, proves it."],
     ["Bedrock AgentCore", "TypeScript"]),
    ("staycovered", "StayCovered", "#60a5fa", "LIVE",
     ["A Medicaid copilot that answers from the rules",
      "as of a date. Ships WorkReqBench, an open benchmark."],
     ["Nemotron", "Tavily", "TypeScript"]),
    ("rangrez", "Rangrez", "#fb923c", "LIVE",
     ["A self-driving dye lab on Meta models. Matches",
      "a colour on cotton from one phone photo."],
     ["SAM", "Muse", "Hugging Face"]),
    ("dryrun", "DryRun", "#2dd4bf", "APP STORE",
     ["Rehearse the conversation you're dreading.",
      "Your hedging underlines itself as you type."],
     ["Kotlin Multiplatform", "Cloudflare Workers"]),
    ("platelock", "PlateLock", "#f87171", "OPEN SOURCE",
     ["Add the VFX, keep the shot. Generative VFX that",
      "leaves every untouched pixel bit-identical."],
     ["LTX-2.3", "ComfyUI", "Open weights"]),
]

ARSENAL = [
    ("MODELS", "#a78bfa", ["Gemini", "Veo 3.1", "Claude", "NVIDIA Nemotron", "IBM Granite",
                           "Apertus", "Meta SAM", "LTX-2.3", "Gemini TTS"]),
    ("AGENTS & PROTOCOLS", "#22d3ee", ["Multi-agent orchestration", "MCP", "Google ADK",
                                       "Strands Agents", "Bedrock AgentCore", "Human-in-the-loop gates"]),
    ("RETRIEVAL & EVALS", "#34d399", ["RAG", "GraphRAG", "TigerGraph", "FalkorDB", "LLM evals",
                                      "Benchmarks with CIs", "Guardrails"]),
    ("CLOUD & INFRA", "#f472b6", ["Vertex AI", "Cloud Run", "Firebase", "Amazon Bedrock",
                                  "Nebius", "Hugging Face", "Docker", "GitHub Actions"]),
]


# --------------------------------------------------------------------------- helpers
def text_w(s, size):
    """Rough rendered width for a sans font."""
    return len(s) * size * 0.56


def svg(w, h, body, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
            f'viewBox="0 0 {w} {h}" font-family="{FONT}">\n<defs>{defs}</defs>\n{body}\n</svg>\n')


def space_bg(w, h, seed, n_stars, rx=18, nebulae=True, avoid=None):
    rnd = random.Random(seed)
    out = [f'<rect width="{w}" height="{h}" rx="{rx}" fill="url(#bg{seed})"/>']
    defs = (f'<radialGradient id="bg{seed}" cx="30%" cy="20%" r="95%">'
            f'<stop offset="0" stop-color="{BG1}"/><stop offset="1" stop-color="{BG0}"/></radialGradient>'
            f'<filter id="neb{seed}" x="-50%" y="-50%" width="200%" height="200%">'
            f'<feGaussianBlur stdDeviation="40"/></filter>'
            f'<clipPath id="clip{seed}"><rect width="{w}" height="{h}" rx="{rx}"/></clipPath>')
    g = [f'<g clip-path="url(#clip{seed})">']
    if nebulae:
        for cx, cy, r, col, dx in [(0.18, 0.25, 0.22, "#7c3aed", 30), (0.7, 0.75, 0.25, "#0891b2", -40),
                                   (0.9, 0.1, 0.16, "#db2777", 20)]:
            g.append(f'<ellipse cx="{cx*w:.0f}" cy="{cy*h:.0f}" rx="{r*w:.0f}" ry="{r*h*1.4:.0f}" '
                     f'fill="{col}" opacity="0.28" filter="url(#neb{seed})">'
                     f'<animateTransform attributeName="transform" type="translate" '
                     f'values="0 0;{dx} {dx/3:.0f};0 0" dur="{14+abs(dx)/5:.0f}s" repeatCount="indefinite"/>'
                     f'</ellipse>')
    for _ in range(n_stars):
        x, y = rnd.uniform(0, w), rnd.uniform(0, h)
        if avoid and avoid[0] <= x <= avoid[2] and avoid[1] <= y <= avoid[3]:
            continue
        r = rnd.choice([0.5, 0.7, 0.9, 1.1, 1.4])
        d, b = rnd.uniform(2, 6), rnd.uniform(0, 5)
        lo = rnd.uniform(0.1, 0.4)
        g.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="#fff">'
                 f'<animate attributeName="opacity" values="{lo:.2f};1;{lo:.2f}" dur="{d:.1f}s" '
                 f'begin="{b:.1f}s" repeatCount="indefinite"/></circle>')
    out.append("".join(g))
    return defs, out  # caller closes the clip group


def chip(x, y, label, color, size=12):
    w = text_w(label, size) + 22
    return (f'<rect x="{x:.1f}" y="{y}" width="{w:.1f}" height="{size+12}" rx="{(size+12)/2}" '
            f'fill="#070a1a"/>'
            f'<rect x="{x:.1f}" y="{y}" width="{w:.1f}" height="{size+12}" rx="{(size+12)/2}" '
            f'fill="{color}" fill-opacity="0.12" stroke="{color}" stroke-opacity="0.45"/>'
            f'<text x="{x+w/2:.1f}" y="{y+size+5}" font-size="{size}" fill="{color}" '
            f'text-anchor="middle" font-weight="600">{esc(label)}</text>'), w


GRAD_TEXT = ('<linearGradient id="gt" x1="0" x2="1">'
             '<stop offset="0" stop-color="#22d3ee"/><stop offset="0.5" stop-color="#a78bfa"/>'
             '<stop offset="1" stop-color="#f472b6"/>'
             '<animate attributeName="x1" values="0;-1;0" dur="8s" repeatCount="indefinite"/>'
             '<animate attributeName="x2" values="1;2;1" dur="8s" repeatCount="indefinite"/>'
             '</linearGradient>'
             '<filter id="glow" x="-20%" y="-50%" width="140%" height="200%">'
             '<feGaussianBlur stdDeviation="6" result="b"/>'
             '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>')


# --------------------------------------------------------------------------- hero
def hero():
    W, H = 1000, 360
    d, b = space_bg(W, H, 1, 140)
    d += GRAD_TEXT
    d += ('<radialGradient id="planet" cx="35%" cy="30%" r="75%">'
          '<stop offset="0" stop-color="#c4b5fd"/><stop offset="0.45" stop-color="#7c3aed"/>'
          '<stop offset="1" stop-color="#1e1b4b"/></radialGradient>'
          '<linearGradient id="ring" x1="0" x2="1"><stop offset="0" stop-color="#22d3ee" stop-opacity="0.1"/>'
          '<stop offset="0.5" stop-color="#22d3ee"/><stop offset="1" stop-color="#f472b6" stop-opacity="0.2"/>'
          '</linearGradient>'
          '<linearGradient id="shoot" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/>'
          '<stop offset="1" stop-color="#fff"/></linearGradient>'
          '<clipPath id="front"><rect x="-200" y="0" width="400" height="100"/></clipPath>'
          '<filter id="pglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>')
    # shooting stars
    for i, (y, delay) in enumerate([(70, 1), (190, 5.5)]):
        b.append(f'<line x1="0" y1="0" x2="90" y2="0" stroke="url(#shoot)" stroke-width="1.6" '
                 f'stroke-linecap="round" opacity="0" transform="translate(-120 {y}) rotate(12)">'
                 f'<animateTransform attributeName="transform" type="translate" '
                 f'values="-120 {y};1100 {y+230}" dur="9s" begin="{delay}s" repeatCount="indefinite"/>'
                 f'<animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.02;0.12;0.16;1" '
                 f'dur="9s" begin="{delay}s" repeatCount="indefinite"/></line>')
    # planet system
    px, py = 815, 175
    b.append(f'<circle cx="{px}" cy="{py}" r="95" fill="#7c3aed" opacity="0.35" filter="url(#pglow)"/>')
    b.append(f'<ellipse cx="{px}" cy="{py}" rx="165" ry="58" fill="none" stroke="#a78bfa" '
             f'stroke-opacity="0.25" stroke-dasharray="3 7" transform="rotate(-14 {px} {py})"/>')
    b.append(f'<g transform="translate({px} {py}) rotate(-18)">'
             f'<ellipse rx="118" ry="24" fill="none" stroke="url(#ring)" stroke-width="7" opacity="0.55"/></g>')
    b.append(f'<circle cx="{px}" cy="{py}" r="66" fill="url(#planet)"/>')
    for k, op in [(-24, .18), (-4, .12), (18, .14)]:
        b.append(f'<ellipse cx="{px}" cy="{py+k}" rx="{(66**2-k**2)**0.5:.0f}" ry="5" fill="#fff" opacity="{op}"/>')
    b.append(f'<g transform="translate({px} {py}) rotate(-18)" clip-path="url(#front)">'
             f'<ellipse rx="118" ry="24" fill="none" stroke="url(#ring)" stroke-width="7"/></g>')
    # moons on orbits
    orbit = (f'M {px-165} {py} a 165 58 0 1 0 330 0 a 165 58 0 1 0 -330 0')
    b.append(f'<g transform="rotate(-14 {px} {py})">'
             f'<circle r="7" fill="#22d3ee" filter="url(#glow)"><animateMotion dur="11s" repeatCount="indefinite" path="{orbit}"/></circle>'
             f'<circle r="4" fill="#f472b6"><animateMotion dur="11s" begin="-5.5s" repeatCount="indefinite" path="{orbit}"/></circle>'
             f'</g>')
    # text block
    x = 56
    b.append(f'<text x="{x}" y="92" font-family="{MONO}" font-size="15" fill="#22d3ee" opacity="0.9">'
             f'// transmission from New Delhi, India</text>')
    b.append(f'<text x="{x}" y="160" font-size="62" font-weight="800" fill="url(#gt)" '
             f'letter-spacing="-1.5" filter="url(#glow)">Tushar Agarwal</text>')
    b.append(f'<text x="{x}" y="200" font-size="21" fill="#c7d2fe" font-weight="500">'
             f'AI Engineer who ships agents you can actually verify</text>')
    cx = x
    for label, col in [("5× Hackathon Winner", "#fbbf24"), ("50+ AI products shipped", "#22d3ee"),
                       ("Builder @ GoKwik", "#f472b6")]:
        c, w = chip(cx, 224, label, col, 13)
        b.append(c)
        cx += w + 10
    b.append(f'<text x="{x}" y="300" font-family="{MONO}" font-size="15" fill="#94a3b8">'
             f'<tspan fill="#34d399">$</tspan> ship --verifiable --live --today'
             f'<tspan fill="#e2e8f0">▍<animate attributeName="opacity" values="1;0;1" dur="1.1s" '
             f'repeatCount="indefinite"/></tspan></text>')
    b.append('</g>')
    b.append(f'<rect x="0.5" y="0.5" width="{W-1}" height="{H-1}" rx="18" fill="none" '
             f'stroke="#a78bfa" stroke-opacity="0.25"/>')
    return svg(W, H, "\n".join(b), d)


# --------------------------------------------------------------------------- stats
def stats():
    W, H = 1000, 150
    d, b = "", []
    d += GRAD_TEXT
    cw, gap = 235, 20
    for i, (num, label, sub) in enumerate(STATS):
        x = i * (cw + gap)
        delay = i * 0.25
        b.append(f'<g opacity="0" transform="translate({x} 14)">'
                 f'<animate attributeName="opacity" from="0" to="1" begin="{delay}s" dur="0.8s" fill="freeze"/>'
                 f'<animateTransform attributeName="transform" type="translate" from="{x} 30" to="{x} 10" '
                 f'begin="{delay}s" dur="0.8s" fill="freeze"/>'
                 f'<rect width="{cw}" height="126" rx="16" fill="{BG1}" stroke="#a78bfa" stroke-opacity="0.3"/>'
                 f'<rect width="{cw}" height="3" rx="1.5" fill="url(#gt)"/>'
                 f'<text x="{cw/2}" y="62" font-size="44" font-weight="800" fill="url(#gt)" '
                 f'text-anchor="middle">{esc(num)}</text>'
                 f'<text x="{cw/2}" y="90" font-size="15" fill="#e2e8f0" text-anchor="middle" '
                 f'font-weight="600">{esc(label)}</text>'
                 f'<text x="{cw/2}" y="110" font-size="12.5" fill="#94a3b8" text-anchor="middle">{esc(sub)}</text>'
                 f'</g>')
    return svg(W, H, "\n".join(b), d)


# --------------------------------------------------------------------------- trophies
MEDAL = {"gold": ("#fde68a", "#f59e0b"), "silver": ("#f1f5f9", "#94a3b8"),
         "bronze": ("#fed7aa", "#c2410c"), "violet": ("#ddd6fe", "#7c3aed")}


def trophies():
    W = 1000
    row_h, top = 74, 74
    H = top + row_h * len(WINS) + 20
    d, b = space_bg(W, H, 2, 70, nebulae=True)
    d += GRAD_TEXT
    for k, (c1, c2) in MEDAL.items():
        d += (f'<radialGradient id="m{k}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="{c1}"/>'
              f'<stop offset="1" stop-color="{c2}"/></radialGradient>')
    b.append(f'<text x="40" y="48" font-family="{MONO}" font-size="14" fill="#22d3ee">'
             f'MISSION LOG // {len(WINS) - 1} hackathon wins in 2026, plus 1 at work</text>')
    for i, (rank, medal, title, sub, field) in enumerate(WINS):
        y = top + i * row_h
        c1, c2 = MEDAL[medal]
        b.append(f'<g opacity="0"><animate attributeName="opacity" from="0" to="1" '
                 f'begin="{0.15*i:.2f}s" dur="0.6s" fill="freeze"/>')
        b.append(f'<rect x="24" y="{y}" width="{W-48}" height="{row_h-12}" rx="14" fill="#ffffff" '
                 f'fill-opacity="0.035" stroke="{c2}" stroke-opacity="0.35"/>')
        mx, my = 66, y + (row_h - 12) / 2
        b.append(f'<circle cx="{mx}" cy="{my}" r="19" fill="url(#m{medal})"/>')
        b.append(f'<circle cx="{mx}" cy="{my}" r="25" fill="none" stroke="{c2}" stroke-width="1.5" '
                 f'stroke-dasharray="4 5"><animateTransform attributeName="transform" type="rotate" '
                 f'from="0 {mx} {my}" to="360 {mx} {my}" dur="{10+i}s" repeatCount="indefinite"/></circle>')
        star = " ".join(f"{mx + r*math.cos(a):.1f},{my + r*math.sin(a):.1f}"
                        for j in range(10)
                        for r, a in [((8 if j % 2 == 0 else 3.6), -1.5708 + j * 0.6283)])
        b.append(f'<polygon points="{star}" fill="#fff" fill-opacity="0.9"/>')
        b.append(f'<text x="108" y="{y+26}" font-size="12" font-weight="800" letter-spacing="1.6" '
                 f'fill="{c1}">{esc(rank)}</text>')
        b.append(f'<text x="108" y="{y+48}" font-size="17" font-weight="700" fill="#f8fafc">{esc(title)}</text>')
        if sub:
            b.append(f'<text x="{108 + text_w(rank, 12) + 40}" y="{y+26}" font-size="12.5" '
                     f'fill="#94a3b8">{esc(sub)}</text>')
        if field:
            fw = text_w(field, 13) + 28
            fx = W - 44 - fw
            b.append(f'<rect x="{fx:.0f}" y="{y+18}" width="{fw:.0f}" height="26" rx="13" fill="{c2}" '
                     f'fill-opacity="0.15" stroke="{c2}" stroke-opacity="0.5"/>'
                     f'<text x="{fx+fw/2:.0f}" y="{y+36}" font-size="13" font-weight="700" fill="{c1}" '
                     f'text-anchor="middle">{esc(field)}</text>')
        b.append('</g>')
    b.append('</g>')
    return svg(W, H, "\n".join(b), d)


# --------------------------------------------------------------------------- project cards
def card(slug, name, color, badge, lines, stack, seed):
    W, H = 480, 190
    d, b = space_bg(W, H, 10 + seed, 40, rx=16, nebulae=False, avoid=(10, 15, 370, 180))
    d += (f'<linearGradient id="edge{seed}" x1="0" y1="0" x2="1" y2="1">'
          f'<stop offset="0" stop-color="{color}"/><stop offset="1" stop-color="{color}" stop-opacity="0.05"/>'
          f'</linearGradient>'
          f'<radialGradient id="orb{seed}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/>'
          f'<stop offset="0.3" stop-color="{color}"/><stop offset="1" stop-color="{BG0}"/></radialGradient>'
          f'<filter id="cg{seed}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>')
    # decorative orb top-right
    b.append(f'<circle cx="430" cy="38" r="60" fill="{color}" opacity="0.25" filter="url(#cg{seed})"/>')
    b.append(f'<ellipse cx="430" cy="38" rx="44" ry="10" fill="none" stroke="{color}" stroke-opacity="0.5" '
             f'transform="rotate(-20 430 38)"/>')
    b.append(f'<circle cx="430" cy="38" r="17" fill="url(#orb{seed})">'
             f'<animate attributeName="r" values="17;18.5;17" dur="4s" repeatCount="indefinite"/></circle>')
    b.append(f'<text x="24" y="48" font-size="25" font-weight="800" fill="#f8fafc">{esc(name)}</text>')
    # status pill
    bw = text_w(badge, 11) + 34
    b.append(f'<rect x="24" y="62" width="{bw:.0f}" height="22" rx="11" fill="#22c55e" fill-opacity="0.12" '
             f'stroke="#22c55e" stroke-opacity="0.5"/>'
             f'<circle cx="37" cy="73" r="4" fill="#22c55e"><animate attributeName="opacity" '
             f'values="1;0.25;1" dur="1.6s" repeatCount="indefinite"/></circle>'
             f'<text x="47" y="77.5" font-size="11" font-weight="800" letter-spacing="1.2" fill="#86efac">{esc(badge)}</text>')
    for j, ln in enumerate(lines):
        b.append(f'<text x="24" y="{112 + j*20}" font-size="14.5" fill="#cbd5e1">{esc(ln)}</text>')
    cx = 24
    for s in stack:
        c, w = chip(cx, 148, s, color, 11.5)
        b.append(c)
        cx += w + 8
    b.append('</g>')
    b.append(f'<rect x="0.75" y="0.75" width="{W-1.5}" height="{H-1.5}" rx="16" fill="none" '
             f'stroke="url(#edge{seed})" stroke-width="1.5"/>')
    return svg(W, H, "\n".join(b), d)


# --------------------------------------------------------------------------- arsenal
def arsenal():
    W = 1000
    rows = []
    y = 64
    body = []
    for title, color, items in ARSENAL:
        body.append(f'<text x="40" y="{y}" font-family="{MONO}" font-size="13" font-weight="700" '
                    f'letter-spacing="1.5" fill="{color}">{esc(title)}</text>')
        y += 14
        x = 40
        for it in items:
            w = text_w(it, 13) + 22
            if x + w > W - 40:
                x, y = 40, y + 36
            c, w = chip(x, y, it, color, 13)
            body.append(c)
            x += w + 10
        y += 66
    H = y - 14
    d, b = space_bg(W, H, 3, 60)
    b.append(f'<text x="40" y="34" font-family="{MONO}" font-size="14" fill="#94a3b8">'
             f'<tspan fill="#34d399">$</tspan> cat ~/arsenal.yml</text>')
    b.extend(body)
    b.append('</g>')
    b.append(f'<rect x="0.5" y="0.5" width="{W-1}" height="{H-1}" rx="18" fill="none" '
             f'stroke="#a78bfa" stroke-opacity="0.25"/>')
    return svg(W, H, "\n".join(b), d)


# --------------------------------------------------------------------------- section header
def header(slug, label, kicker):
    W, H = 1000, 70
    d = GRAD_TEXT
    b = [f'<text x="0" y="22" font-family="{MONO}" font-size="13" fill="#22d3ee" letter-spacing="2">{esc(kicker)}</text>',
         f'<text x="0" y="58" font-size="32" font-weight="800" fill="url(#gt)">{esc(label)}</text>',
         f'<rect x="{text_w(label, 32)+24:.0f}" y="45" width="{W - text_w(label, 32) - 24:.0f}" height="1.5" '
         f'fill="url(#gt)" opacity="0.5"/>']
    return svg(W, H, "\n".join(b), d)


# --------------------------------------------------------------------------- footer
def footer():
    W, H = 1000, 150
    d, b = space_bg(W, H, 4, 60, nebulae=False)
    d += GRAD_TEXT + ('<radialGradient id="hz" cx="50%" cy="0%" r="70%">'
                      '<stop offset="0" stop-color="#a78bfa" stop-opacity="0.9"/>'
                      '<stop offset="1" stop-color="#1e1b4b" stop-opacity="0"/></radialGradient>')
    b.append(f'<ellipse cx="500" cy="420" rx="760" ry="310" fill="#0b1030" stroke="url(#gt)" stroke-width="2"/>')
    b.append(f'<ellipse cx="500" cy="112" rx="420" ry="40" fill="url(#hz)" opacity="0.35"/>')
    b.append(f'<text x="500" y="70" font-size="20" font-weight="700" fill="url(#gt)" text-anchor="middle">'
             f'Next launch is already on the pad.</text>')
    b.append(f'<text x="500" y="96" font-family="{MONO}" font-size="13" fill="#94a3b8" text-anchor="middle">'
             f'shipping something new almost every week</text>')
    b.append('</g>')
    return svg(W, H, "\n".join(b), d)


def main():
    files = {
        "hero.svg": hero(),
        "stats.svg": stats(),
        "trophies.svg": trophies(),
        "arsenal.svg": arsenal(),
        "footer.svg": footer(),
        "h-wins.svg": header("wins", "Hackathon Wins", "01 // MISSION LOG"),
        "h-live.svg": header("live", "Live in Production", "02 // DEPLOYED, NOT DEMOED"),
        "h-arsenal.svg": header("arsenal", "The AI Arsenal", "03 // TOOLS OF THE TRADE"),
        "h-flight.svg": header("flight", "Flight Path", "04 // CONTRIBUTIONS IN 3D"),
    }
    for i, p in enumerate(PROJECTS):
        files[f"card-{p[0]}.svg"] = card(*p, seed=i)
    for name, content in files.items():
        (OUT / name).write_text(content, encoding="utf-8")
    print(f"wrote {len(files)} files to {OUT}")


if __name__ == "__main__":
    main()

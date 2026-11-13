/**
 * Background music for Sanad's films, generated live in the browser with the Web Audio API.
 *
 * A small string orchestra in a corporate style — sustained violas and cellos, a driving spiccato
 * ostinato and a deep pulsing bass — with an Arabic voice: the violin sings phrases in maqam Hijaz on
 * D, sliding between notes the way strings do in Egyptian film scores, over a soft doum/tek pattern.
 *
 * Nothing is a recording: every bar is composed as it is scheduled, inside the same key, tempo and
 * instruments, so there is no loop point to hear — the music never "ends and starts again".
 *
 * Browsers only allow sound after the visitor interacts, so `start()` must be called from a click
 * (the films' «ابدأ» button). `setActive()` fades the music in and out (e.g. off while browsing the
 * 2D plan); `setMuted()` is the visitor's own choice and is remembered.
 */

const BPM = 88;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const LOOKAHEAD = 0.4; // seconds of music scheduled ahead of the clock
const VOLUME = 0.6; // master level when playing
const MUTE_KEY = "sanad-film-sound";

/** Maqam Hijaz on D: D E♭ F♯ G A B♭ C — semitones above D. */
const HIJAZ = [0, 1, 4, 5, 7, 8, 10];
const D5 = 74;

type Chord = { root: number; pad: number[]; pulse: number[] };
/** The harmony Hijaz on D gives: D, G minor, C minor, E♭. `pulse` feeds the spiccato ostinato. */
const CHORDS: Record<string, Chord> = {
    D: { root: 38, pad: [50, 57, 62, 66], pulse: [62, 69, 74, 69] },
    Gm: { root: 43, pad: [43, 55, 58, 62], pulse: [62, 67, 70, 67] },
    Cm: { root: 36, pad: [48, 55, 60, 63], pulse: [60, 67, 72, 67] },
    Eb: { root: 39, pad: [51, 55, 58, 63], pulse: [63, 67, 70, 67] },
};
/** Two four-bar progressions; each new phrase picks one (mostly the first), so the form keeps breathing. */
const PROGRESSIONS = [
    ["D", "Gm", "Cm", "D"],
    ["Eb", "Cm", "Gm", "D"],
];
/**
 * Violin phrases in Hijaz, two bars each: [scale degree above D5, beats]. They move by step around the
 * maqam's colour notes (E♭, F♯, A) and come to rest on D or F♯.
 */
const PHRASES: [number, number][][] = [
    [[4, 1.5], [5, 0.5], [4, 0.5], [3, 0.5], [2, 2], [1, 1], [2, 2]],
    [[2, 1], [3, 1], [4, 2], [5, 1], [4, 0.5], [3, 0.5], [4, 2]],
    [[7, 2], [6, 1], [5, 1], [4, 1.5], [3, 0.5], [2, 2]],
    [[4, 1], [2, 1], [1, 1], [0, 1], [1, 2], [0, 2]],
    [[0, 1], [1, 0.5], [2, 0.5], [3, 1], [4, 3], [2, 2]],
];

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const scaleNote = (degree: number) => {
    const oct = Math.floor(degree / 7);
    return D5 + oct * 12 + HIJAZ[((degree % 7) + 7) % 7];
};
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

class FilmMusic {
    private ctx: AudioContext | null = null;
    private master!: GainNode;
    private bus!: GainNode;
    private verb!: GainNode;
    private noise!: AudioBuffer;
    private timer: number | null = null;
    private nextBar = 0;
    private bar = 0;
    private progression = PROGRESSIONS[0];
    private active = false;
    private _muted = false;
    private listeners = new Set<() => void>();

    constructor() {
        if (typeof window !== "undefined") {
            try {
                this._muted = localStorage.getItem(MUTE_KEY) === "off";
            } catch {
                /* storage may be blocked; default to sound on */
            }
        }
    }

    get muted() {
        return this._muted;
    }
    get started() {
        return this.ctx !== null;
    }

    subscribe(fn: () => void) {
        this.listeners.add(fn);
        return () => {
            this.listeners.delete(fn);
        };
    }
    private emit() {
        this.listeners.forEach((fn) => fn());
    }

    /** Must run inside a user gesture. Safe to call more than once. */
    async start() {
        if (typeof window === "undefined") return;
        if (!this.ctx) this.build();
        if (this.ctx!.state === "suspended") await this.ctx!.resume();
        if (this.timer === null) {
            this.nextBar = this.ctx!.currentTime + 0.1;
            this.timer = window.setInterval(() => this.tick(), 60);
            document.addEventListener("visibilitychange", this.onVisibility);
        }
        this.setActive(true);
        this.emit();
    }

    /** Fades the music in or out (the scene decides when music belongs). */
    setActive(on: boolean) {
        this.active = on;
        this.applyLevel(on ? 2.5 : 1.6);
    }

    setMuted(m: boolean) {
        this._muted = m;
        try {
            localStorage.setItem(MUTE_KEY, m ? "off" : "on");
        } catch {
            /* ignore */
        }
        this.applyLevel(0.8);
        this.emit();
    }

    private onVisibility = () => this.applyLevel(0.6);

    private applyLevel(seconds: number) {
        if (!this.ctx) return;
        const audible = this.active && !this._muted && document.visibilityState === "visible";
        const t = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.setValueAtTime(this.master.gain.value, t);
        this.master.gain.linearRampToValueAtTime(audible ? VOLUME : 0, t + seconds);
    }

    /* ---------------- the graph: sections → bus → (dry + hall) → compressor → master ---------------- */

    private build() {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        this.ctx = ctx;

        this.master = ctx.createGain();
        this.master.gain.value = 0;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.ratio.value = 2.5;
        comp.attack.value = 0.03;
        comp.release.value = 0.35;
        comp.connect(this.master).connect(ctx.destination);

        this.bus = ctx.createGain();
        this.bus.connect(comp);

        // a concert-hall tail: stereo noise, slightly darker as it decays
        const len = Math.floor(ctx.sampleRate * 3.6);
        const ir = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = ir.getChannelData(ch);
            let lp = 0;
            for (let i = 0; i < len; i++) {
                lp = lp * 0.6 + (Math.random() * 2 - 1) * 0.4;
                d[i] = lp * Math.pow(1 - i / len, 2.6);
            }
        }
        const conv = ctx.createConvolver();
        conv.buffer = ir;
        this.verb = ctx.createGain();
        this.verb.gain.value = 0.8;
        this.verb.connect(conv).connect(comp);

        // white noise, for bow noise and percussion
        this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const nd = this.noise.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    }

    /** Routes a voice to the dry bus, and by `wet` to the hall; `pan` places it across the stage. */
    private out(node: AudioNode, wet: number, pan = 0) {
        const ctx = this.ctx!;
        let src: AudioNode = node;
        if (pan) {
            const p = ctx.createStereoPanner();
            p.pan.value = pan;
            node.connect(p);
            src = p;
        }
        src.connect(this.bus);
        if (wet > 0) {
            const g = ctx.createGain();
            g.gain.value = wet;
            src.connect(g).connect(this.verb);
        }
    }

    /* ---------------- the scheduler ---------------- */

    private tick() {
        const ctx = this.ctx;
        if (!ctx) return;
        // nothing to hear: keep the clock moving without stacking up notes
        if (this.master.gain.value < 0.001 && !this.active) {
            this.nextBar = Math.max(this.nextBar, ctx.currentTime + 0.1);
            return;
        }
        while (this.nextBar < ctx.currentTime + LOOKAHEAD) {
            this.scheduleBar(this.nextBar, this.bar);
            this.nextBar += BAR;
            this.bar++;
        }
    }

    private scheduleBar(t: number, n: number) {
        if (n % 4 === 0) this.progression = PROGRESSIONS[Math.random() < 0.7 ? 0 : 1];
        const chord = CHORDS[this.progression[n % 4]];
        // every sixteen bars the rhythm section rests for two bars, so the piece breathes
        const breath = n >= 16 && n % 16 >= 14;
        // the arrangement builds over the first bars, then stays full
        this.strings(t, chord);
        if (n >= 2 && !breath) this.bass(t, chord);
        if (n >= 2 && !breath) this.spiccato(t, chord, n);
        if (n >= 4 && n % 2 === 0 && Math.random() < 0.8) this.violin(t, pick(PHRASES), n % 8 === 4 && Math.random() < 0.4 ? 7 : 0);
        if (n >= 6 && !breath) this.percussion(t, n);
    }

    /* ---------------- the string orchestra ---------------- */

    /**
     * One bowed string voice: a few detuned saws (an ensemble, not a single player) with their own
     * slow vibrato, a soft bow attack and a darker top end.
     */
    private bowed(t: number, m: number, dur: number, level: number, opts: { attack: number; release: number; bright: number; pan: number; wet: number }) {
        const ctx = this.ctx!;
        const f = mtof(m);
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = Math.min(9000, f * opts.bright);
        lp.Q.value = 0.5;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 70;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(level, t + opts.attack);
        env.gain.setValueAtTime(level, t + Math.max(opts.attack, dur - 0.05));
        env.gain.linearRampToValueAtTime(0, t + dur + opts.release);
        lp.connect(hp).connect(env);
        this.out(env, opts.wet, opts.pan);
        const end = t + dur + opts.release + 0.05;
        for (const det of [-11, -4, 3, 10]) {
            const o = ctx.createOscillator();
            o.type = "sawtooth";
            o.frequency.value = f;
            o.detune.value = det;
            const vib = ctx.createOscillator();
            vib.frequency.value = 4.6 + Math.random() * 1.2;
            const vibAmt = ctx.createGain();
            vibAmt.gain.setValueAtTime(0, t);
            vibAmt.gain.linearRampToValueAtTime(7, t + Math.min(1.2, dur));
            vib.connect(vibAmt).connect(o.detune);
            o.connect(lp);
            o.start(t);
            vib.start(t);
            o.stop(end);
            vib.stop(end);
        }
    }

    /** Violas and cellos hold the harmony, crossfading bar to bar; the cellos double the root below. */
    private strings(t: number, chord: Chord) {
        const dur = BAR;
        chord.pad.forEach((m, i) => this.bowed(t, m, dur, 0.016, { attack: 0.9, release: 1.1, bright: 5, pan: i % 2 ? 0.25 : -0.25, wet: 0.5 }));
        this.bowed(t, chord.root + 12, dur, 0.02, { attack: 0.7, release: 1.1, bright: 4, pan: -0.35, wet: 0.35 });
    }

    /** Short, bouncing bows on every eighth: the forward motion of a corporate score. */
    private spiccato(t: number, chord: Chord, n: number) {
        const ctx = this.ctx!;
        for (let i = 0; i < 8; i++) {
            const at = t + i * (BEAT / 2);
            const m = chord.pulse[i % 4];
            const accent = i % 4 === 0 ? 1 : i % 2 === 0 ? 0.75 : 0.55;
            const lp = ctx.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.setValueAtTime(3200, at);
            lp.frequency.exponentialRampToValueAtTime(900, at + 0.16);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, at);
            g.gain.linearRampToValueAtTime(0.03 * accent * (n % 16 < 2 ? 0.7 : 1), at + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
            lp.connect(g);
            this.out(g, 0.3, 0.3);
            for (const det of [-8, 0, 7]) {
                const o = ctx.createOscillator();
                o.type = "sawtooth";
                o.frequency.value = mtof(m);
                o.detune.value = det;
                o.connect(lp);
                o.start(at);
                o.stop(at + 0.25);
            }
        }
    }

    /**
     * The violin's Hijaz phrase, played legato: one ensemble voice for the whole phrase whose pitch
     * slides into each new note (the portamento of Arabic string writing), with a gentle swell per note
     * and vibrato that blooms on the long ones.
     */
    private violin(t: number, phrase: [number, number][], lift: number) {
        const ctx = this.ctx!;
        const notes = phrase.map(([deg, beats]) => ({ m: scaleNote(deg + lift), dur: beats * BEAT }));
        const total = notes.reduce((s, x) => s + x.dur, 0);
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 3600;
        lp.Q.value = 0.6;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 250;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        const level = 0.032;
        let at = t;
        notes.forEach((x, i) => {
            env.gain.linearRampToValueAtTime(level * 0.7, at + 0.03);
            env.gain.linearRampToValueAtTime(level, at + Math.min(0.25, x.dur * 0.5));
            if (i === notes.length - 1) env.gain.linearRampToValueAtTime(0, at + x.dur + 0.6);
            else env.gain.linearRampToValueAtTime(level * 0.82, at + x.dur - 0.02);
            at += x.dur;
        });
        lp.connect(hp).connect(env);
        this.out(env, 0.55, 0.15);

        // a breath of bow noise on the attacks
        const bow = ctx.createBufferSource();
        bow.buffer = this.noise;
        bow.loop = true;
        const bf = ctx.createBiquadFilter();
        bf.type = "bandpass";
        bf.frequency.value = 2400;
        bf.Q.value = 0.8;
        const bg = ctx.createGain();
        bg.gain.value = 0.025;
        bow.connect(bf).connect(bg).connect(env);

        const end = t + total + 0.7;
        for (const det of [-9, -2, 4, 11]) {
            const o = ctx.createOscillator();
            o.type = "sawtooth";
            o.detune.value = det;
            let when = t;
            notes.forEach((x, i) => {
                const f = mtof(x.m);
                if (i === 0) o.frequency.setValueAtTime(f, t);
                else {
                    // slide into the note
                    const glide = 0.09;
                    o.frequency.setValueAtTime(mtof(notes[i - 1].m), Math.max(t, when - glide));
                    o.frequency.exponentialRampToValueAtTime(f, when + 0.01);
                }
                when += x.dur;
            });
            const vib = ctx.createOscillator();
            vib.frequency.value = 5.2 + Math.random() * 0.6;
            const vibAmt = ctx.createGain();
            vibAmt.gain.setValueAtTime(2, t);
            vibAmt.gain.linearRampToValueAtTime(14, t + Math.min(1.5, total));
            vib.connect(vibAmt).connect(o.detune);
            o.connect(lp);
            o.start(t);
            vib.start(t);
            o.stop(end);
            vib.stop(end);
        }
        bow.start(t, Math.random() * 0.5);
        bow.stop(end);
    }

    /* ---------------- bass and percussion ---------------- */

    /** A deep pulsing bass: sub sine under a dark, plucky saw, on 1, the "and" of 2, 3 and a pickup. */
    private bass(t: number, chord: Chord) {
        const hits: [number, number, number, number][] = [
            [0, chord.root, BEAT * 1.3, 1],
            [BEAT * 1.5, chord.root, BEAT * 0.45, 0.75],
            [BEAT * 2, chord.root, BEAT * 1.3, 0.9],
            [BEAT * 3.5, Math.random() < 0.5 ? chord.root : chord.root + 7, BEAT * 0.45, 0.7],
        ];
        for (const [at, m, dur, vel] of hits) this.bassNote(t + at, m, dur, vel);
    }
    private bassNote(t: number, m: number, dur: number, vel: number) {
        const ctx = this.ctx!;
        const sub = ctx.createOscillator();
        sub.type = "sine";
        sub.frequency.value = mtof(m);
        const body = ctx.createOscillator();
        body.type = "sawtooth";
        body.frequency.value = mtof(m);
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.setValueAtTime(420, t);
        lp.frequency.exponentialRampToValueAtTime(160, t + 0.25);
        lp.Q.value = 1.2;
        const bodyG = ctx.createGain();
        bodyG.gain.value = 0.5;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.2 * vel, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.08 * vel, t + dur * 0.6);
        g.gain.linearRampToValueAtTime(0, t + dur);
        sub.connect(g);
        body.connect(lp).connect(bodyG).connect(g);
        this.out(g, 0.06);
        sub.start(t);
        body.start(t);
        sub.stop(t + dur + 0.05);
        body.stop(t + dur + 0.05);
    }

    /** A soft maqsum-like pattern: deep doum on 1 and the "and" of 2, tek on 2 and 4, a light riq. */
    private percussion(t: number, n: number) {
        this.doum(t, 1);
        this.doum(t + BEAT * 1.5, 0.7);
        if (n % 2 === 1) this.doum(t + BEAT * 3, 0.6);
        this.tek(t + BEAT, 0.6);
        this.tek(t + BEAT * 3, 0.6);
        this.tek(t + BEAT * 2.5, 0.35);
        for (let i = 0; i < 8; i++) if (Math.random() < 0.4) this.tek(t + i * (BEAT / 2) + BEAT / 4, 0.15, true);
    }
    private doum(t: number, vel: number) {
        const ctx = this.ctx!;
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(95, t);
        o.frequency.exponentialRampToValueAtTime(48, t + 0.25);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.2 * vel, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        o.connect(g);
        this.out(g, 0.15);
        o.start(t);
        o.stop(t + 0.55);
    }
    private tek(t: number, vel: number, riq = false) {
        const ctx = this.ctx!;
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        const f = ctx.createBiquadFilter();
        f.type = riq ? "highpass" : "bandpass";
        f.frequency.value = riq ? 7500 : 2200;
        f.Q.value = riq ? 0.7 : 1.6;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.06 * vel, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (riq ? 0.06 : 0.1));
        src.connect(f).connect(g);
        this.out(g, 0.25, riq ? -0.3 : 0.1);
        src.start(t, Math.random() * 0.5);
        src.stop(t + 0.14);
    }
}

/** One player for the whole site, so moving between films never stacks two of them. */
export const filmMusic = new FilmMusic();

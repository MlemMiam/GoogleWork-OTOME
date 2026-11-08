/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private lastStepTime: number = 0;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playFootstep(isIndoors: boolean, isRunning: boolean) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const minInterval = isRunning ? 0.24 : 0.38;
    if (now - this.lastStepTime < minInterval) return;
    this.lastStepTime = now;

    // Procedural footstep sound using filtered noise burst + tone
    const bufferSize = this.ctx.sampleRate * 0.06;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = isIndoors ? 'bandpass' : 'lowpass';
    filter.frequency.value = isIndoors ? 800 : 450;
    filter.Q.value = isIndoors ? 2.5 : 0.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isIndoors ? 0.12 : 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
  }

  public playBell() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Classic high school bell chime: 4 notes sequence (E4, G#4, F#4, B3)
    const freqs = [329.63, 415.3, 369.99, 246.94];
    freqs.forEach((freq, idx) => {
      const startTime = now + idx * 0.45;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Add harmonic overtone
      const osc2 = this.ctx!.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2.02, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc2.start(startTime);
      osc.stop(startTime + 1.3);
      osc2.stop(startTime + 1.3);
    });
  }
}

export const soundManager = new SoundManager();

// =========================================================================
// MÓDULO DE FEEDBACK INDUSTRIAL (ÁUDIO PIEZOELÉTRICO + RESPOSTA HÁPTICA)
// Simula coletores industriais (Zebra TC21/TC26, Motorola Symbol, Honeywell)
// Suporta vibração nativa em celulares/coletores e áudio sintetizado em alta precisão
// =========================================================================

class IndustrialFeedbackEngine {
  constructor() {
    this.audioCtx = null;
    this.storagePrefix = 'sap_portal_rf_feedback_';

    // Preferências persistidas
    this.soundEnabled = localStorage.getItem(this.storagePrefix + 'sound') !== 'false';
    this.hapticEnabled = localStorage.getItem(this.storagePrefix + 'haptic') !== 'false';
    this.volume = parseFloat(localStorage.getItem(this.storagePrefix + 'volume') || '0.7');

    // Inicialização silenciosa ao primeiro toque do usuário
    this._bindUserInteraction();
  }

  _bindUserInteraction() {
    const unlock = () => {
      this._initContext();
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }

  _initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // ─── FEEDBACK HÁPTICO (VIBRAÇÃO DO DISPOSITIVO) ──────────────────────────

  vibrate(pattern) {
    if (!this.hapticEnabled) return;
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (err) {
      console.debug('[Haptic] Vibração não suportada:', err);
    }
  }

  // ─── 1. BIP DE LEITURA BEM-SUCEDIDA (Zebra / Motorola Standard) ───────────
  // Frequência de 2700Hz cortante com envelope piezoelétrico ultra-rápido (65ms)
  beepSuccess() {
    // 1. Vibração curta e seca padrão coletor industrial
    this.vibrate([60]);

    if (!this.soundEnabled) return;
    try {
      this._initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const filter = this.audioCtx.createBiquadFilter();
      const gain = this.audioCtx.createGain();

      // Onda quadrada com harmônicos para corte de ruído acústico
      osc.type = 'square';
      osc.frequency.setValueAtTime(2650, now);

      // Filtro passa-banda para simular a câmara acústica do coletor
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2700, now);
      filter.Q.setValueAtTime(4.0, now);

      // Envelope ADSR super percussivo (Ataque 2ms, Decaimento 60ms)
      const targetVol = 0.25 * this.volume;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(targetVol, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.068);
    } catch (e) {
      console.warn('Erro ao reproduzir bip industrial:', e);
    }
  }

  // ─── 2. BIP DE CONFIRMAÇÃO DE APONTAMENTO NO SAP (Trinado Positivo) ───────
  // Sequência ascendente tríade maior (1760Hz -> 2200Hz -> 2640Hz)
  beepPostSuccess() {
    // Vibração dupla afirmativa
    this.vibrate([45, 50, 95]);

    if (!this.soundEnabled) return;
    try {
      this._initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const tones = [1760, 2200, 2640];

      tones.forEach((freq, i) => {
        const tStart = now + (i * 0.065);
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, tStart);

        const targetVol = 0.22 * this.volume;
        gain.gain.setValueAtTime(0.001, tStart);
        gain.gain.exponentialRampToValueAtTime(targetVol, tStart + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, tStart + 0.08);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(tStart);
        osc.stop(tStart + 0.085);
      });
    } catch (e) {
      console.warn('Erro ao reproduzir confirmação SAP:', e);
    }
  }

  // ─── 3. BIP DE ERRO / DIVERGÊNCIA / SALDO INSUFICIENTE (Buzzer Grave) ─────
  // Tom duplo de rejeição áspero (320Hz -> 210Hz)
  beepError() {
    // Vibração longa de alerta pesado
    this.vibrate([180, 80, 240]);

    if (!this.soundEnabled) return;
    try {
      this._initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;

      // Pulso 1
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(320, now);
      osc1.frequency.linearRampToValueAtTime(260, now + 0.16);

      const targetVol = 0.35 * this.volume;
      gain1.gain.setValueAtTime(targetVol, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.16);

      // Pulso 2 (Mais grave e áspero)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(220, now + 0.19);
      osc2.frequency.linearRampToValueAtTime(160, now + 0.40);

      gain2.gain.setValueAtTime(targetVol * 1.1, now + 0.19);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.40);

      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.19);
      osc2.stop(now + 0.40);
    } catch (e) {
      console.warn('Erro ao reproduzir buzzer de erro:', e);
    }
  }

  // ─── CONTROLES DE PREFERÊNCIA ───────────────────────────────────────────

  setSound(enabled) {
    this.soundEnabled = enabled;
    localStorage.setItem(this.storagePrefix + 'sound', enabled ? 'true' : 'false');
    if (enabled) this.beepSuccess();
  }

  setHaptic(enabled) {
    this.hapticEnabled = enabled;
    localStorage.setItem(this.storagePrefix + 'haptic', enabled ? 'true' : 'false');
    if (enabled) this.vibrate([80]);
  }

  testAll() {
    this.beepSuccess();
    setTimeout(() => this.beepPostSuccess(), 350);
  }
}

// Instância global compatível com todo o sistema
window.industrialBeeper = new IndustrialFeedbackEngine();

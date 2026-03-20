// ─── listener.js — Speech Recognition "Följ med" ───

let listenActive = false;
let recognition = null;
let currentMatchSection = -1;
let currentMatchLine = -1;
let listenTranscript = '';

// Normalize text for comparison: lowercase, strip punctuation, collapse whitespace
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"()\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Build a flat list of lyric lines with section/line indices for matching
function buildLyricIndex(song) {
  const lines = [];
  song.sections.forEach((sec, si) => {
    sec.lines.forEach((line, li) => {
      const lyric = (line.l || '').trim();
      if (lyric) {
        lines.push({
          si, li,
          text: normalizeText(lyric),
          raw: lyric
        });
      }
    });
  });
  return lines;
}

// Find the best matching line for a transcript snippet
function findBestMatch(transcript, lyricIndex, startFrom = 0) {
  const normalized = normalizeText(transcript);
  if (normalized.length < 3) return null;

  // Split transcript into words
  const words = normalized.split(' ').filter(w => w.length > 1);
  if (words.length === 0) return null;

  let bestScore = 0;
  let bestIdx = -1;

  // Search forward from current position (with wrap)
  const searchOrder = [];
  for (let i = startFrom; i < lyricIndex.length; i++) searchOrder.push(i);
  for (let i = 0; i < startFrom; i++) searchOrder.push(i);

  for (const idx of searchOrder) {
    const line = lyricIndex[idx];
    const lineWords = line.text.split(' ');

    // Count matching words (allow fuzzy: substring match)
    let score = 0;
    let consecutiveBonus = 0;
    let lastMatchPos = -2;

    for (const word of words) {
      if (word.length < 2) continue;
      for (let lw = 0; lw < lineWords.length; lw++) {
        // Exact match or one is a substring of the other (fuzzy for speech errors)
        if (lineWords[lw] === word ||
            (word.length >= 3 && lineWords[lw].includes(word)) ||
            (lineWords[lw].length >= 3 && word.includes(lineWords[lw]))) {
          score += 1;
          if (lw === lastMatchPos + 1) consecutiveBonus += 0.5;
          lastMatchPos = lw;
          break;
        }
        // Levenshtein-light: allow 1 char difference for words >= 4 chars
        if (word.length >= 4 && lineWords[lw].length >= 4) {
          if (levenshteinLight(word, lineWords[lw]) <= 1) {
            score += 0.7;
            if (lw === lastMatchPos + 1) consecutiveBonus += 0.3;
            lastMatchPos = lw;
            break;
          }
        }
      }
    }

    score += consecutiveBonus;

    // Bias toward forward progress (small bonus for being near current position)
    if (idx >= startFrom && idx <= startFrom + 3) {
      score += 0.3;
    }

    // Require at least 2 matching words or >40% match
    const minWords = Math.max(2, words.length * 0.35);
    if (score >= minWords && score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  }

  if (bestIdx === -1) return null;
  return lyricIndex[bestIdx];
}

// Simple edit distance (only checks if distance <= 1 for speed)
function levenshteinLight(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  if (a === b) return 0;

  let diff = 0;
  let ai = 0, bi = 0;

  while (ai < a.length && bi < b.length) {
    if (a[ai] !== b[bi]) {
      diff++;
      if (diff > 1) return 2;
      if (a.length > b.length) ai++;
      else if (b.length > a.length) bi++;
      else { ai++; bi++; }
    } else {
      ai++; bi++;
    }
  }

  return diff + (a.length - ai) + (b.length - bi);
}

// Highlight a section and scroll to it
function highlightSection(sectionIdx) {
  // Remove previous highlights
  document.querySelectorAll('.song-block.listening-active').forEach(el => {
    el.classList.remove('listening-active');
  });

  const block = document.querySelector(`.song-block[data-section="${sectionIdx}"]`);
  if (block) {
    block.classList.add('listening-active');
    block.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Detect language from song lyrics
function detectLanguage(song) {
  const allText = song.sections.map(s => s.lines.map(l => l.l || '').join(' ')).join(' ').toLowerCase();

  // Simple heuristics
  if (/\b(och|jag|som|det|att|med|den|för|har|kan|ska|vill|min|din|alla|inte)\b/.test(allText)) return 'sv-SE';
  if (/\b(the|and|was|but|that|how|grace|once|been|will)\b/.test(allText)) return 'en-US';
  if (/\b(una|che|bella|ciao|della|morto|partigiano|fiore|questa|seppellire)\b/.test(allText)) return 'it-IT';
  if (/\b(und|der|die|das|ich|ein|nicht|mit|haben)\b/.test(allText)) return 'de-DE';
  if (/\b(les|des|une|que|est|avec|dans|pour|pas)\b/.test(allText)) return 'fr-FR';

  return 'sv-SE'; // default
}

// Start listening
function startListening() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('Taligenkänning stöds inte i denna webbläsare. Prova Chrome eller Edge.');
    return false;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  // Detect language from current song
  const song = songs[currentSong];
  const lang = detectLanguage(song);
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;

  const lyricIndex = buildLyricIndex(song);
  let searchFrom = 0;
  let lastInterim = '';

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      // Check all alternatives for best match
      let bestAlt = result[0].transcript;
      if (result.length > 1) {
        // Pick the alternative that best matches our lyrics
        let bestAltScore = -1;
        for (let a = 0; a < result.length; a++) {
          const alt = result[a].transcript;
          const match = findBestMatch(alt, lyricIndex, searchFrom);
          if (match) {
            const score = result[a].confidence || 0.5;
            if (score > bestAltScore) {
              bestAltScore = score;
              bestAlt = alt;
            }
          }
        }
      }

      if (result.isFinal) {
        finalTranscript += bestAlt;
      } else {
        interimTranscript += bestAlt;
      }
    }

    // Try to match with interim results for faster response
    const textToMatch = finalTranscript || interimTranscript;
    if (textToMatch && textToMatch !== lastInterim) {
      lastInterim = textToMatch;
      const match = findBestMatch(textToMatch, lyricIndex, searchFrom);
      if (match) {
        const lineIdx = lyricIndex.indexOf(match);
        if (match.si !== currentMatchSection) {
          currentMatchSection = match.si;
          currentMatchLine = match.li;
          highlightSection(match.si);
        }
        // Advance search position
        if (lineIdx >= 0) {
          searchFrom = Math.max(0, lineIdx - 1);
        }
      }
    }

    // Update listening indicator
    const indicator = document.getElementById('listenIndicator');
    if (indicator) {
      const displayText = (interimTranscript || finalTranscript).slice(-50);
      indicator.textContent = displayText ? `🎤 "${displayText}..."` : '🎤 Lyssnar...';
    }
  };

  recognition.onerror = (event) => {
    console.warn('Speech recognition error:', event.error);
    if (event.error === 'not-allowed') {
      alert('Mikrofonåtkomst nekades. Tillåt mikrofonen i webbläsaren.');
      stopListening();
    } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
      // Restart on transient errors
      if (listenActive) {
        setTimeout(() => {
          if (listenActive && recognition) {
            try { recognition.start(); } catch(e) {}
          }
        }, 500);
      }
    }
  };

  recognition.onend = () => {
    // Auto-restart if still active (speech recognition stops periodically)
    if (listenActive) {
      setTimeout(() => {
        if (listenActive && recognition) {
          try { recognition.start(); } catch(e) {}
        }
      }, 1000);
    }
  };

  try {
    recognition.start();
    listenActive = true;
    return true;
  } catch (e) {
    console.error('Could not start speech recognition:', e);
    return false;
  }
}

function stopListening() {
  listenActive = false;
  if (recognition) {
    try { recognition.stop(); } catch(e) {}
    recognition = null;
  }
  currentMatchSection = -1;
  currentMatchLine = -1;

  // Remove highlights
  document.querySelectorAll('.song-block.listening-active').forEach(el => {
    el.classList.remove('listening-active');
  });

  // Remove indicator
  const indicator = document.getElementById('listenIndicator');
  if (indicator) indicator.remove();
}

// ─── Exports for testing ───
if (typeof exports !== 'undefined') {
  exports.normalizeText = normalizeText;
  exports.buildLyricIndex = buildLyricIndex;
  exports.findBestMatch = findBestMatch;
  exports.levenshteinLight = levenshteinLight;
  exports.detectLanguage = detectLanguage;
}

function toggleListen() {
  if (listenActive) {
    stopListening();
    document.getElementById('listenBtn').classList.remove('active');
  } else {
    const started = startListening();
    if (started) {
      document.getElementById('listenBtn').classList.add('active');

      // Add listening indicator below topbar
      if (!document.getElementById('listenIndicator')) {
        const indicator = document.createElement('div');
        indicator.id = 'listenIndicator';
        indicator.className = 'listen-indicator';
        indicator.textContent = '🎤 Lyssnar...';
        const display = document.getElementById('songDisplay');
        display.insertBefore(indicator, display.firstChild);
      }
    }
  }
}

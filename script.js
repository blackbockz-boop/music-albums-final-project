/* ========================================================
   SPOTIFY  —  PKCE Authorization Code Flow (no backend needed)
   1. Go to https://developer.spotify.com/dashboard
   2. Create an app, then add your page URL as Redirect URI
      e.g. http://127.0.0.1:5500/index.html  (VS Code Live Server)
   3. Copy your Client ID and paste it below
======================================================== */
const SPOTIFY_CLIENT_ID    = 'YOUR_CLIENT_ID_HERE';
const SPOTIFY_REDIRECT_URI = window.location.href.split('?')[0].split('#')[0];

let spotifyToken = sessionStorage.getItem('spotify_token') || null;
let searchTimer  = null;
let currentAlbum = null;

function genVerifier() {
  const arr = new Uint8Array(64);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
async function genChallenge(v) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
async function connectSpotify() {
  const v = genVerifier(), c = await genChallenge(v);
  sessionStorage.setItem('spotify_verifier', v);
  window.location.href = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID, response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT_URI, scope: '',
    code_challenge_method: 'S256', code_challenge: c,
  });
}
async function exchangeCode(code) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID, grant_type: 'authorization_code',
      code, redirect_uri: SPOTIFY_REDIRECT_URI,
      code_verifier: sessionStorage.getItem('spotify_verifier'),
    }),
  });
  return (await res.json()).access_token || null;
}
async function spotifySearch(q) {
  if (!spotifyToken || !q.trim()) return [];
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=24`,
    { headers: { Authorization: `Bearer ${spotifyToken}` } }
  );
  if (res.status === 401) {
    spotifyToken = null; sessionStorage.removeItem('spotify_token'); setSpotifyUI(false); return [];
  }
  return (await res.json()).albums?.items || [];
}
function toAlbum(item) {
  return {
    id: item.id, title: item.name,
    artist: item.artists.map(a => a.name).join(', '),
    year: parseInt(item.release_date) || 0,
    genre: 'Spotify', mood: '', emoji: null,
    coverUrl: item.images?.[0]?.url || null,
    gradient: 'linear-gradient(135deg, #121212, #1e3a2f)',
    desc: `${item.album_type[0].toUpperCase()+item.album_type.slice(1)} · ${item.total_tracks} tracks · ${item.release_date?.slice(0,4)||'N/A'}`,
    tracks: item.total_tracks, spotifyUrl: item.external_urls?.spotify || null,
  };
}
function setSpotifyUI(connected) {
  const btn  = document.getElementById('spotifyBtn');
  const note = document.getElementById('spotifyNote');
  if (!btn) return;
  if (connected) {
    btn.innerHTML = '<i class="fa-brands fa-spotify"></i> Connected to Spotify';
    btn.classList.add('spotify-connected');
    if (note) note.textContent = 'Type in the search bar to search millions of albums on Spotify.';
  } else {
    btn.innerHTML = '<i class="fa-brands fa-spotify"></i> Connect Spotify';
    btn.classList.remove('spotify-connected');
    if (note) note.textContent = '';
  }
}
async function renderSpotifyResults(query) {
  const grid  = document.getElementById('albumGrid');
  const empty = document.getElementById('emptyState');
  [...grid.querySelectorAll('.album-card')].forEach(c => c.remove());
  empty.style.display = 'none';
  const loader = document.createElement('div');
  loader.className = 'spotify-loader';
  loader.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Searching Spotify…';
  grid.appendChild(loader);
  const results = (await spotifySearch(query)).map(toAlbum);
  loader.remove();
  document.getElementById('countNum').textContent = results.length;
  document.getElementById('visibleCount').textContent = results.length;
  if (!results.length) { empty.style.display = 'block'; return; }
  results.forEach(album => {
    const card = document.createElement('div');
    card.className = 'album-card';
    card.innerHTML = `
      <div class="card-cover${album.coverUrl ? ' has-img' : ''}" style="${album.coverUrl ? '' : 'background:'+album.gradient}">
        ${album.coverUrl ? `<img src="${album.coverUrl}" alt="${album.title}" class="cover-img">` : '<span style="font-size:3.5rem">🎵</span>'}
        <span class="card-badge">${album.year||'?'}</span>
        <div class="play-overlay"><i class="fa-solid fa-circle-play"></i></div>
      </div>
      <div class="card-body">
        <p class="card-title">${album.title}</p>
        <p class="card-artist">${album.artist}</p>
        <div class="card-meta">
          <span class="card-genre" style="background:rgba(30,215,96,.15);color:#1ed760;border:1px solid rgba(30,215,96,.3)">Spotify</span>
          <span class="card-year">${album.tracks} tracks</span>
        </div>
      </div>
      <div class="card-footer">
        <span class="card-mood"><i class="fa-brands fa-spotify" style="color:#1ed760"></i> ${album.year||'N/A'}</span>
        <button class="btn-listen">Details</button>
      </div>`;
    card.addEventListener('click', () => openModal(album));
    grid.appendChild(card);
  });
}

/* ========================================================
   DATA
======================================================== */
const albums = [
  {
    id: 1, title: "Thriller", artist: "Michael Jackson",
    year: 1982, genre: "Pop", mood: "Energetic",
    emoji: "🕺", gradient: "linear-gradient(135deg, #1a1a2e, #e94560)",
    desc: "The best-selling album of all time. A masterclass in pop production with iconic tracks that defined an era.",
    tracks: 9
  },
  {
    id: 2, title: "Abbey Road", artist: "The Beatles",
    year: 1969, genre: "Rock", mood: "Happy",
    emoji: "🎸", gradient: "linear-gradient(135deg, #1f4037, #99f2c8)",
    desc: "The Beatles' final studio masterpiece. A seamless suite of songs that captures the magic of the Fab Four at their peak.",
    tracks: 17
  },
  {
    id: 3, title: "Kind of Blue", artist: "Miles Davis",
    year: 1959, genre: "Jazz", mood: "Chill",
    emoji: "🎺", gradient: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
    desc: "The best-selling jazz album of all time. Defined modal jazz and set a new standard for improvisation and cool.",
    tracks: 5
  },
  {
    id: 4, title: "Rumours", artist: "Fleetwood Mac",
    year: 1977, genre: "Rock", mood: "Romantic",
    emoji: "🌙", gradient: "linear-gradient(135deg, #373b44, #4286f4)",
    desc: "Born from turbulent relationships, Rumours captures heartbreak and longing in a perfect blend of soft rock elegance.",
    tracks: 11
  },
  {
    id: 5, title: "The Chronic", artist: "Dr. Dre",
    year: 1992, genre: "Hip-Hop", mood: "Energetic",
    emoji: "🎤", gradient: "linear-gradient(135deg, #134e5e, #71b280)",
    desc: "The record that introduced G-Funk to the world. A West Coast hip-hop landmark still influential to this day.",
    tracks: 16
  },
  {
    id: 6, title: "Random Access Memories", artist: "Daft Punk",
    year: 2013, genre: "Electronic", mood: "Energetic",
    emoji: "🤖", gradient: "linear-gradient(135deg, #b8860b, #ffd700)",
    desc: "A love letter to the golden age of disco and funk, crafted with live musicians and state-of-the-art production.",
    tracks: 13
  },
  {
    id: 7, title: "Lemonade", artist: "Beyoncé",
    year: 2016, genre: "R&B", mood: "Energetic",
    emoji: "🍋", gradient: "linear-gradient(135deg, #f7971e, #ffd200)",
    desc: "A visual and sonic odyssey exploring love, infidelity, and Black womanhood — Beyoncé's most personal statement.",
    tracks: 12
  },
  {
    id: 8, title: "To Pimp a Butterfly", artist: "Kendrick Lamar",
    year: 2015, genre: "Hip-Hop", mood: "Dark",
    emoji: "🦋", gradient: "linear-gradient(135deg, #1a1a1a, #4a4a4a, #1a6b3c)",
    desc: "A politically charged jazz-funk-hip-hop masterwork exploring race, identity, and systemic inequality in America.",
    tracks: 16
  },
  {
    id: 9, title: "Blonde", artist: "Frank Ocean",
    year: 2016, genre: "R&B", mood: "Chill",
    emoji: "🌊", gradient: "linear-gradient(135deg, #4facfe, #00f2fe)",
    desc: "An introspective, fragmented journey through youth and memory. Ocean's stream-of-consciousness approach feels deeply intimate.",
    tracks: 17
  },
  {
    id: 10, title: "1989", artist: "Taylor Swift",
    year: 2014, genre: "Pop", mood: "Happy",
    emoji: "✨", gradient: "linear-gradient(135deg, #89f7fe, #66a6ff)",
    desc: "Taylor Swift's bold pop reinvention. Synth-driven and radio-ready with anthems that dominated the decade.",
    tracks: 13
  },
  {
    id: 11, title: "The Dark Side of the Moon", artist: "Pink Floyd",
    year: 1973, genre: "Rock", mood: "Dark",
    emoji: "🌑", gradient: "linear-gradient(135deg, #000000, #434343)",
    desc: "A groundbreaking concept album exploring the human experience — greed, time, mental illness — via seamless psychedelic rock.",
    tracks: 10
  },
  {
    id: 12, title: "Currents", artist: "Tame Impala",
    year: 2015, genre: "Electronic", mood: "Chill",
    emoji: "🌀", gradient: "linear-gradient(135deg, #7f00ff, #e100ff)",
    desc: "Kevin Parker's shift into electronic pop, filled with lush synths and confessional lyrics about personal transformation.",
    tracks: 13
  },
  {
    id: 13, title: "Born to Run", artist: "Bruce Springsteen",
    year: 1975, genre: "Rock", mood: "Energetic",
    emoji: "🏃", gradient: "linear-gradient(135deg, #c94b4b, #4b134f)",
    desc: "The Boss's arrival statement. A cinematic, wall-of-sound portrait of working-class America dreaming of escape.",
    tracks: 8
  },
  {
    id: 14, title: "Folklore", artist: "Taylor Swift",
    year: 2020, genre: "Pop", mood: "Chill",
    emoji: "🌲", gradient: "linear-gradient(135deg, #485563, #29323c)",
    desc: "A surprise indie-folk detour that revealed Swift's storytelling depth — intimate, introspective, and universally acclaimed.",
    tracks: 16
  },
  {
    id: 15, title: "Midnight Marauders", artist: "A Tribe Called Quest",
    year: 1993, genre: "Hip-Hop", mood: "Chill",
    emoji: "🎶", gradient: "linear-gradient(135deg, #f46b45, #eea849)",
    desc: "The gold standard of jazz rap. Smooth, intellectually rich, and effortlessly cool — a hip-hop time capsule.",
    tracks: 14
  },
  {
    id: 16, title: "Nevermind", artist: "Nirvana",
    year: 1991, genre: "Rock", mood: "Dark",
    emoji: "💥", gradient: "linear-gradient(135deg, #2c3e50, #3498db)",
    desc: "The album that brought alternative rock to the mainstream and defined a generation's disillusionment and raw energy.",
    tracks: 13
  }
];

/* ========================================================
   GENRE COLORS
======================================================== */
const genreColors = {
  "Pop":        { bg: "rgba(236,72,153,.18)", color: "#ec4899", border: "rgba(236,72,153,.35)" },
  "Rock":       { bg: "rgba(239,68,68,.18)",  color: "#f87171", border: "rgba(239,68,68,.35)" },
  "Hip-Hop":    { bg: "rgba(234,179,8,.18)",  color: "#facc15", border: "rgba(234,179,8,.35)" },
  "R&B":        { bg: "rgba(16,185,129,.18)", color: "#34d399", border: "rgba(16,185,129,.35)" },
  "Jazz":       { bg: "rgba(59,130,246,.18)", color: "#60a5fa", border: "rgba(59,130,246,.35)" },
  "Electronic": { bg: "rgba(168,85,247,.18)", color: "#c084fc", border: "rgba(168,85,247,.35)" },
};

const moodIcons = {
  "Chill":      "fa-wind",
  "Energetic":  "fa-bolt",
  "Romantic":   "fa-heart",
  "Dark":       "fa-moon",
  "Happy":      "fa-face-smile",
};

/* ========================================================
   STATE
======================================================== */
const state = { genre: "all", mood: "all", decade: "all", search: "", sort: "default" };

/* ========================================================
   HELPERS
======================================================== */
function getDecade(year) {
  if (year < 1970) return "60s";
  if (year < 1980) return "70s";
  if (year < 1990) return "80s";
  if (year < 2000) return "90s";
  if (year < 2010) return "2000s";
  if (year < 2020) return "2010s";
  return "2020s";
}

function filterAndSort() {
  let result = albums.filter(a => {
    const matchGenre  = state.genre  === "all" || a.genre === state.genre;
    const matchMood   = state.mood   === "all" || a.mood  === state.mood;
    const matchDecade = state.decade === "all" || getDecade(a.year) === state.decade;
    const q = state.search.toLowerCase();
    const matchSearch = !q || a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q);
    return matchGenre && matchMood && matchDecade && matchSearch;
  });

  switch (state.sort) {
    case "year-desc":  result.sort((a,b) => b.year - a.year); break;
    case "year-asc":   result.sort((a,b) => a.year - b.year); break;
    case "title-az":   result.sort((a,b) => a.title.localeCompare(b.title)); break;
    case "artist-az":  result.sort((a,b) => a.artist.localeCompare(b.artist)); break;
  }
  return result;
}

/* ========================================================
   RENDER
======================================================== */
function renderGrid() {
  const grid = document.getElementById("albumGrid");
  const empty = document.getElementById("emptyState");
  const data = filterAndSort();
  const count = data.length;

  document.getElementById("countNum").textContent = count;
  document.getElementById("visibleCount").textContent = count;

  [...grid.querySelectorAll(".album-card")].forEach(c => c.remove());

  if (count === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  data.forEach(album => {
    const gc = genreColors[album.genre] || genreColors["Pop"];
    const icon = moodIcons[album.mood] || "fa-music";
    const card = document.createElement("div");
    card.className = "album-card";
    card.dataset.id = album.id;
    card.innerHTML = `
      <div class="card-cover${album.coverUrl ? ' has-img' : ''}" style="${album.coverUrl ? '' : 'background:'+album.gradient}">
        ${album.coverUrl ? `<img src="${album.coverUrl}" alt="${album.title}" class="cover-img">` : album.emoji}
        <span class="card-badge">${album.year}</span>
        <div class="play-overlay"><i class="fa-solid fa-circle-play"></i></div>
      </div>
      <div class="card-body">
        <p class="card-title">${album.title}</p>
        <p class="card-artist">${album.artist}</p>
        <div class="card-meta">
          <span class="card-genre" style="background:${gc.bg};color:${gc.color};border:1px solid ${gc.border}">${album.genre}</span>
          <span class="card-year">${album.tracks} tracks</span>
        </div>
      </div>
      <div class="card-footer">
        <span class="card-mood"><i class="fa-solid ${icon}"></i> ${album.mood}</span>
        <button class="btn-listen">Details</button>
      </div>`;
    card.addEventListener("click", () => openModal(album));
    grid.appendChild(card);
  });
}

/* ========================================================
   MODAL
======================================================== */
function openModal(album) {
  currentAlbum = album;
  const gc   = genreColors[album.genre] || { bg: 'rgba(30,215,96,.15)', color: '#1ed760', border: 'rgba(30,215,96,.3)' };
  const icon = moodIcons[album.mood] || 'fa-music';
  const modal   = document.getElementById('modal');
  const coverEl = document.getElementById('modalCover');
  document.getElementById('modalTitle').textContent  = album.title;
  document.getElementById('modalArtist').textContent = 'by ' + album.artist;
  document.getElementById('modalDesc').textContent   = album.desc;
  coverEl.style.background = album.coverUrl ? '#000' : album.gradient;
  coverEl.innerHTML = album.coverUrl
    ? `<img src="${album.coverUrl}" alt="${album.title}" class="modal-cover-img"><button class="modal-close" id="modalClose" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>`
    : `<span style="font-size:5rem">${album.emoji}</span><button class="modal-close" id="modalClose" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>`;
  const genreTag = album.spotifyUrl
    ? `<span class="modal-tag" style="background:rgba(30,215,96,.15);color:#1ed760;border:1px solid rgba(30,215,96,.3)"><i class="fa-brands fa-spotify"></i> Spotify</span>`
    : `<span class="modal-tag" style="background:${gc.bg};color:${gc.color};border:1px solid ${gc.border}">${album.genre}</span>`;
  const moodTag = album.mood ? `<span class="modal-tag"><i class="fa-solid ${icon}"></i> ${album.mood}</span>` : '';
  document.getElementById('modalTags').innerHTML = `${genreTag}${moodTag}
    <span class="modal-tag"><i class="fa-solid fa-calendar"></i> ${album.year||'N/A'}</span>
    <span class="modal-tag"><i class="fa-solid fa-music"></i> ${album.tracks} tracks</span>`;
  modal.classList.add('open');
  document.getElementById('modalClose').addEventListener('click', closeModal);
}

function closeModal() {
  document.getElementById("modal").classList.remove("open");
}

document.getElementById("modal").addEventListener("click", e => {
  if (e.target === document.getElementById("modal")) closeModal();
});

document.getElementById('modalListen').addEventListener('click', () => {
  if (currentAlbum?.spotifyUrl) {
    window.open(currentAlbum.spotifyUrl, '_blank', 'noopener');
  } else {
    alert('🎵 Connect Spotify using the button in the hero to open albums on Spotify!');
  }
});
document.getElementById("modalAdd").addEventListener("click", () => {
  alert("✅ Added to your playlist!");
});

/* ========================================================
   CHIP FILTERS
======================================================== */
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    const filter = chip.dataset.filter;
    const value  = chip.dataset.value;
    document.querySelectorAll(`.chip[data-filter="${filter}"]`).forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    state[filter] = value;
    renderGrid();
  });
});

document.getElementById("clearFilters").addEventListener("click", () => {
  state.genre = "all"; state.mood = "all"; state.decade = "all"; state.search = "";
  document.getElementById("searchInput").value = "";
  document.querySelectorAll(".chip").forEach(c => {
    c.classList.toggle("active", c.dataset.value === "all");
  });
  state.sort = "default";
  document.getElementById("sortSelect").value = "default";
  renderGrid();
});

/* ========================================================
   SEARCH
======================================================== */
document.getElementById('searchInput').addEventListener('input', e => {
  state.search = e.target.value;
  if (spotifyToken) {
    clearTimeout(searchTimer);
    if (state.search.trim()) {
      searchTimer = setTimeout(() => renderSpotifyResults(state.search), 450);
    } else {
      renderGrid();
    }
  } else {
    renderGrid();
  }
});

/* ========================================================
   SORT
======================================================== */
document.getElementById("sortSelect").addEventListener("change", e => {
  state.sort = e.target.value;
  renderGrid();
});

/* ========================================================
   KEYBOARD CLOSE MODAL
======================================================== */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

/* ========================================================
  SPOTIFY CONNECT BUTTON
======================================================== */
document.getElementById('spotifyBtn')?.addEventListener('click', connectSpotify);

/* ========================================================
  INIT
======================================================== */
(async () => {
  const params = new URLSearchParams(window.location.search);
  const code   = params.get('code');
  if (code) {
   history.replaceState({}, '', window.location.pathname);
   const token = await exchangeCode(code);
   if (token) { spotifyToken = token; sessionStorage.setItem('spotify_token', token); }
  }
  setSpotifyUI(!!spotifyToken);
  renderGrid();
})();

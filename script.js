/* ========================================================
   iTUNES API  —  Album Cover Lookup (free, no authentication)
======================================================== */
function normalizeText(value) {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function pickBestItunesMatch(results, title, artist) {
  const wantedTitle = normalizeText(title);
  const wantedArtist = normalizeText(artist);

  const ranked = (results || []).map(item => {
    const itemTitle = normalizeText(item.collectionName);
    const itemArtist = normalizeText(item.artistName);
    let score = 0;

    if (itemTitle === wantedTitle) score += 6;
    if (itemArtist === wantedArtist) score += 6;
    if (itemTitle.includes(wantedTitle) || wantedTitle.includes(itemTitle)) score += 3;
    if (itemArtist.includes(wantedArtist) || wantedArtist.includes(itemArtist)) score += 3;

    return { item, score };
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked[0]?.score > 0 ? ranked[0].item : null;
}

async function itunesLookup(title, artist) {
  try {
    const query = `${title} ${artist}`.trim();
    const endpoints = [
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=10`,
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=album&limit=10`
    ];

    for (const url of endpoints) {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const hit = pickBestItunesMatch(data.results, title, artist);
      if (hit?.artworkUrl100) {
        return hit.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg');
      }
    }
    return null;
  } catch (e) {
    console.error('iTunes lookup failed for', title, artist);
    return null;
  }
}

async function loadAlbumCoverURLs() {
  const statusEl = document.getElementById('apiStatus');
  if (statusEl) statusEl.textContent = 'API status: loading album covers...';

  let loaded = 0;
  for (const album of albums) {
    album.coverUrl = await itunesLookup(album.title, album.artist);
    if (album.coverUrl) loaded += 1;
  }

  if (statusEl) {
    statusEl.textContent = loaded > 0
      ? `API status: connected (${loaded}/${albums.length} covers loaded)`
      : 'API status: request failed (using emoji fallback)';
  }
}

let currentAlbum = null;

/* ========================================================
   DATA
======================================================== */
const albums = [
  {
    id: 1, title: "Thriller", artist: "Michael Jackson",
    year: 1982, genre: "Pop",
    emoji: "🕺", gradient: "linear-gradient(135deg, #1a1a2e, #e94560)",
    desc: "The best-selling album of all time. A masterclass in pop production with iconic tracks that defined an era.",
    tracks: 9
  },
  {
    id: 2, title: "Minor Threat", artist: "Minor Threat",
    year: 1981, genre: "Rock",
    emoji: "⚡", gradient: "linear-gradient(135deg, #111111, #7a0000)",
    desc: "The explosive debut EP that helped define Washington, D.C. hardcore with relentless speed, direct lyrics, and uncompromising energy.",
    tracks: 8
  },
  {
    id: 3, title: "Kind of Blue", artist: "Miles Davis",
    year: 1959, genre: "Jazz",
    emoji: "🎺", gradient: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
    desc: "The best-selling jazz album of all time. Defined modal jazz and set a new standard for improvisation and cool.",
    tracks: 5
  },
  {
    id: 4, title: "IGOR", artist: "Tyler, The Creator",
    year: 2019, genre: "Hip-Hop",
    emoji: "🩷", gradient: "linear-gradient(135deg, #f2a7c0, #c2185b)",
    desc: "A genre-bending, emotionally charged album that blends soul, rap, funk, and pop into one of Tyler's most acclaimed releases.",
    tracks: 12
  },
  {
    id: 5, title: "The Chronic", artist: "Dr. Dre",
    year: 1992, genre: "Hip-Hop",
    emoji: "🎤", gradient: "linear-gradient(135deg, #134e5e, #71b280)",
    desc: "The record that introduced G-Funk to the world. A West Coast hip-hop landmark still influential to this day.",
    tracks: 16
  },
  {
    id: 6, title: "Random Access Memories", artist: "Daft Punk",
    year: 2013, genre: "Electronic",
    emoji: "🤖", gradient: "linear-gradient(135deg, #b8860b, #ffd700)",
    desc: "A love letter to the golden age of disco and funk, crafted with live musicians and state-of-the-art production.",
    tracks: 13
  },
  {
    id: 7, title: "The Smiths", artist: "The Smiths",
    year: 1984, genre: "Rock",
    emoji: "🌿", gradient: "linear-gradient(135deg, #3a5a40, #588157)",
    desc: "The debut album that introduced The Smiths' jangling guitars, melancholic wit, and unmistakable voice to British alternative music.",
    tracks: 11
  },
  {
    id: 8, title: "To Pimp a Butterfly", artist: "Kendrick Lamar",
    year: 2015, genre: "Hip-Hop",
    emoji: "🦋", gradient: "linear-gradient(135deg, #1a1a1a, #4a4a4a, #1a6b3c)",
    desc: "A politically charged jazz-funk-hip-hop masterwork exploring race, identity, and systemic inequality in America.",
    tracks: 16
  },
  {
    id: 9, title: "Blonde", artist: "Frank Ocean",
    year: 2016, genre: "R&B",
    emoji: "🌊", gradient: "linear-gradient(135deg, #4facfe, #00f2fe)",
    desc: "An introspective, fragmented journey through youth and memory. Ocean's stream-of-consciousness approach feels deeply intimate.",
    tracks: 17
  },
  {
    id: 10, title: "Madvillainy", artist: "Madvillain",
    year: 2004, genre: "Hip-Hop",
    emoji: "🎭", gradient: "linear-gradient(135deg, #2f2f2f, #6b7280)",
    desc: "A cult classic collaboration between MF DOOM and Madlib, known for abstract lyricism, dusty loops, and unconventional song structure.",
    tracks: 22
  },
  {
    id: 11, title: "The Dark Side of the Moon", artist: "Pink Floyd",
    year: 1973, genre: "Rock",
    emoji: "🌑", gradient: "linear-gradient(135deg, #000000, #434343)",
    desc: "A groundbreaking concept album exploring the human experience — greed, time, mental illness — via seamless psychedelic rock.",
    tracks: 10
  },
  {
    id: 12, title: "Currents", artist: "Tame Impala",
    year: 2015, genre: "Electronic",
    emoji: "🌀", gradient: "linear-gradient(135deg, #7f00ff, #e100ff)",
    desc: "Kevin Parker's shift into electronic pop, filled with lush synths and confessional lyrics about personal transformation.",
    tracks: 13
  },
  {
    id: 13, title: "Enter the Wu-Tang (36 Chambers)", artist: "Wu-Tang Clan",
    year: 1993, genre: "Hip-Hop",
    emoji: "⚔️", gradient: "linear-gradient(135deg, #1a1a1a, #f5c518)",
    desc: "The raw, gritty debut that changed hip-hop forever. Nine MCs from Staten Island forged one of the most iconic group records ever made.",
    tracks: 12
  },
  {
    id: 14, title: "The Hurting", artist: "Tears for Fears",
    year: 1983, genre: "Pop",
    emoji: "😢", gradient: "linear-gradient(135deg, #1a1a2e, #16213e)",
    desc: "The debut album that launched Tears for Fears into the spotlight. A haunting synth-pop record rooted in themes of pain, isolation, and primal therapy.",
    tracks: 10
  },
  {
    id: 15, title: "The Battle of Los Angeles", artist: "Rage Against the Machine",
    year: 1999, genre: "Rock",
    emoji: "✊", gradient: "linear-gradient(135deg, #7f0000, #d32f2f)",
    desc: "A ferocious fusion of hip-hop, metal, and punk-fueled politics. One of the most explosive and influential rock records of the 90s.",
    tracks: 11
  },
  {
    id: 16, title: "Nevermind", artist: "Nirvana",
    year: 1991, genre: "Rock",
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

/* ========================================================
   STATE
======================================================== */
const state = { search: "", sort: "default" };

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
  const q = state.search.toLowerCase();
  let result = albums.filter(a => {
    return !q || a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q);
  });

  if (state.sort.startsWith('decade-')) {
    const decade = state.sort.replace('decade-', '');
    result = result.filter(a => getDecade(a.year) === decade);
  } else {
    switch (state.sort) {
      case "year-desc":  result.sort((a,b) => b.year - a.year); break;
      case "year-asc":   result.sort((a,b) => a.year - b.year); break;
      case "title-az":   result.sort((a,b) => a.title.localeCompare(b.title)); break;
      case "artist-az":  result.sort((a,b) => a.artist.localeCompare(b.artist)); break;
    }
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
  const modal   = document.getElementById('modal');
  const coverEl = document.getElementById('modalCover');
  document.getElementById('modalTitle').textContent  = album.title;
  document.getElementById('modalArtist').textContent = 'by ' + album.artist;
  document.getElementById('modalDesc').textContent   = album.desc;
  coverEl.style.background = album.coverUrl ? '#000' : album.gradient;
  coverEl.innerHTML = album.coverUrl
    ? `<img src="${album.coverUrl}" alt="${album.title}" class="modal-cover-img"><button class="modal-close" id="modalClose" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>`
    : `<span style="font-size:5rem">${album.emoji}</span><button class="modal-close" id="modalClose" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>`;
  const genreTag = `<span class="modal-tag" style="background:${gc.bg};color:${gc.color};border:1px solid ${gc.border}">${album.genre}</span>`;
  document.getElementById('modalTags').innerHTML = `${genreTag}
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
  alert('🎵 Search "' + currentAlbum.title + '" on your favorite music platform!');
});

document.getElementById('searchInput').addEventListener('input', e => {
  state.search = e.target.value;
  renderGrid();
});

/* ========================================================
   SORT
======================================================== */
document.getElementById("sortSelect").addEventListener("change", e => {
  state.sort = e.target.value;
  document.getElementById("searchInput").value = "";
  state.search = "";
  renderGrid();
});

/* ========================================================
   KEYBOARD CLOSE MODAL
======================================================== */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

/* ========================================================
  INIT
======================================================== */
(async () => {
  await loadAlbumCoverURLs();
  renderGrid();
})();

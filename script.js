const BLOCKED_TITLE_WORDS = ['tribute', 'karaoke', 'instrumental', 'interview', 'live', 'commentary'];

/* ========================================================
   DEFAULT ALBUMS — edit this list to change the front page
======================================================== */
const DEFAULT_ALBUMS = [
  { title: 'Thriller',                        artist: 'Michael Jackson'       },
  { title: 'Kind of Blue',                    artist: 'Miles Davis'           },
  { title: 'Nevermind',                       artist: 'Nirvana'               },
  { title: 'To Pimp a Butterfly',             artist: 'Kendrick Lamar'        },
  { title: 'Random Access Memories',          artist: 'Daft Punk'             },
  { title: 'Madvillainy',                     artist: 'Madvillain'            },
  { title: 'Enter the Wu-Tang (36 Chambers)', artist: 'Wu-Tang Clan'          },
  { title: 'The Battle of Los Angeles',       artist: 'Rage Against the Machine' },
  { title: 'Currents',                        artist: 'Tame Impala'           },
  { title: 'Wish You Were Here',              artist: 'Pink Floyd'            },
  { title: '2001',                            artist: 'Dr. Dre'               },
  { title: 'The Hurting',                     artist: 'Tears for Fears'       },
  { title: 'The Smiths',                      artist: 'The Smiths'            },
  { title: 'channel ORANGE',                   artist: 'Frank Ocean'           },
  { title: 'First Two Seven Inches',          artist: 'Minor Threat'          },
  { title: "DON'T TAP THE GLASS",            artist: 'Tyler, the Creator'    },
];

let currentAlbum = null;
let coversLoading = true;
let albums = [];
let searchDebounceTimer = null;

function normalizeText(value) {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/* ========================================================
   GENRE HELPERS
======================================================== */
const genreEmoji = {
  'Pop': '🎵', 'Rock': '🎸', 'Hip-Hop': '🎤', 'R&B': '🎶', 'Jazz': '🎺', 'Electronic': '🤖'
};

const genreGradient = {
  'Pop':        'linear-gradient(135deg, #1a1a2e, #e94560)',
  'Rock':       'linear-gradient(135deg, #2c3e50, #3498db)',
  'Hip-Hop':    'linear-gradient(135deg, #1a1a1a, #f5c518)',
  'R&B':        'linear-gradient(135deg, #0f2027, #203a43)',
  'Jazz':       'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
  'Electronic': 'linear-gradient(135deg, #7f00ff, #e100ff)',
};

function mapGenre(itunesGenre) {
  const g = (itunesGenre || '').toLowerCase();
  if (g.includes('hip') || g.includes('rap')) return 'Hip-Hop';
  if (g.includes('r&b') || g.includes('soul')) return 'R&B';
  if (g.includes('jazz')) return 'Jazz';
  if (g.includes('electronic') || g.includes('dance') || g.includes('techno')) return 'Electronic';
  if (g.includes('rock') || g.includes('alternative') || g.includes('metal') || g.includes('punk') || g.includes('indie')) return 'Rock';
  return 'Pop';
}

function isBlockedTitle(title) {
  const cleaned = normalizeText(title);
  return BLOCKED_TITLE_WORDS.some(word => cleaned.includes(word));
}

/* ========================================================
   API — MAP ITUNES RESULT TO ALBUM OBJECT
======================================================== */
function mapItunesAlbum(result, id) {
  const year = parseInt((result.releaseDate || '').slice(0, 4)) || null;
  const genre = mapGenre(result.primaryGenreName);
  const artwork = result.artworkUrl100 || result.artworkUrl60 || null;
  return {
    id,
    title: result.collectionName || 'Unknown Album',
    artist: result.artistName || 'Unknown Artist',
    year,
    genre,
    emoji: genreEmoji[genre] || '🎵',
    gradient: genreGradient[genre] || 'linear-gradient(135deg, #1a1a2e, #16213e)',
    desc: `${result.collectionName} by ${result.artistName}${year ? ', released in ' + year : ''}.`,
    tracks: result.trackCount || 0,
    coverUrl: artwork ? artwork.replace(/\/\d+x\d+bb\.(jpg|png)/, '/600x600bb.$1') : null
  };
}

/* ========================================================
   API — FETCH ALBUMS BY SEARCH QUERY
======================================================== */
async function fetchAlbums(query) {
  const statusEl = document.getElementById('apiStatus');
  if (statusEl) statusEl.textContent = 'API status: loading...';

  coversLoading = true;
  albums = [];
  renderGrid();

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=25`;
    const response = await fetch(url);
    const data = await response.json();

    const seen = new Set();
    for (const result of data.results || []) {
      if (!result.collectionName || !result.artworkUrl100) continue;
      if (result.collectionType === 'Compilation') continue;
      if (isBlockedTitle(result.collectionName)) continue;
      const key = `${normalizeText(result.collectionName)}|${normalizeText(result.artistName)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      albums.push(mapItunesAlbum(result, albums.length + 1));
    }

    if (statusEl) {
      statusEl.textContent = albums.length > 0
        ? `API status: connected (${albums.length} albums loaded)`
        : 'API status: no results found';
    }
  } catch (error) {
    console.error('Failed to fetch albums:', error);
    if (statusEl) statusEl.textContent = 'API status: request failed';
  }

  coversLoading = false;
  renderGrid();
}

/* ========================================================
   API — LOAD DEFAULT ALBUMS ON PAGE LOAD
======================================================== */
async function loadDefaultAlbums() {
  const statusEl = document.getElementById('apiStatus');
  if (statusEl) statusEl.textContent = 'API status: loading albums...';

  coversLoading = true;
  albums = [];
  renderGrid();

  try {
    const results = await Promise.all(
      DEFAULT_ALBUMS.map(({ title, artist }) =>
        fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(title + ' ' + artist)}&entity=album&limit=5`)
          .then(r => r.json())
          .then(data => {
            const match = (data.results || []).find(
              r => r.artworkUrl100 && !isBlockedTitle(r.collectionName)
            );
            return match || null;
          })
          .catch(() => null)
      )
    );

    results.forEach((result, i) => {
      if (result) albums.push(mapItunesAlbum(result, i + 1));
    });

    if (statusEl) {
      statusEl.textContent = albums.length > 0
        ? `API status: connected (${albums.length} albums loaded)`
        : 'API status: no results found';
    }
  } catch (error) {
    console.error('Failed to load albums:', error);
    if (statusEl) statusEl.textContent = 'API status: request failed';
  }

  coversLoading = false;
  renderGrid();
}


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
const state = { sort: "default" };

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
  let result = [...albums];

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
    const coverStateClass = album.coverUrl ? ' has-img' : (coversLoading ? ' loading' : ' placeholder');
    const coverInnerHtml = album.coverUrl
      ? `<img src="${album.coverUrl}" alt="${album.title}" class="cover-img">`
      : `<span class="cover-placeholder-label">${coversLoading ? 'Loading...' : 'No Cover'}</span>`;
    const card = document.createElement("div");
    card.className = "album-card";
    card.dataset.id = album.id;
    card.innerHTML = `
      <div class="card-cover${coverStateClass}">
        ${coverInnerHtml}
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
  coverEl.style.background = album.coverUrl ? '#000' : '#11141d';
  coverEl.innerHTML = album.coverUrl
    ? `<img src="${album.coverUrl}" alt="${album.title}" class="modal-cover-img"><button class="modal-close" id="modalClose" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>`
    : `<div class="modal-cover-placeholder">No Cover Available</div><button class="modal-close" id="modalClose" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>`;
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
  const query = e.target.value.trim();
  clearTimeout(searchDebounceTimer);
  if (!query) {
    loadDefaultAlbums();
    return;
  }
  searchDebounceTimer = setTimeout(() => {
    fetchAlbums(query);
  }, 500);
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
  INIT
======================================================== */
(async () => {
  renderGrid();
  await loadDefaultAlbums();
})();

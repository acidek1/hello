// ============================================================
//  KONFIGURACJA — edytuj tylko tutaj
// ============================================================
const PLAYERS = [
    { gameName: 'lisdexamfetamine', tagLine: '140mg' },
    { gameName: 'Franz Peter', tagLine: 'koyo' },
    { gameName: 'head of family', tagLine: 'head' },
    // dodaj kolejnych graczy w tym samym formacie
];

const PLATFORM = 'eun1';    // EUNE
const CLUSTER = 'europe';  // routing cluster dla match-v5
const DDRAGON = '14.10.1'; // wersja Data Dragon (ikony championów/profili)
// ============================================================

const app = document.getElementById('app');

// ── helpers ─────────────────────────────────────────────────

function timeAgo(ts) {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m temu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h temu`;
    return `${Math.floor(diff / 86400)}d temu`;
}

function opggUrl(gameName, tagLine) {
    const regionSlug = PLATFORM.replace('1', '').replace('eun', 'eune');
    return `https://www.op.gg/summoners/${regionSlug}/${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`;
}

// ── fetch data.json generowanego przez GitHub Actions ───────

async function loadData() {
    try {
        const res = await fetch('./data/players.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        throw new Error('Nie można załadować danych graczy. ' + e.message);
    }
}

// ── render ───────────────────────────────────────────────────

function renderWrColor(wr) {
    if (wr >= 55) return 'good';
    if (wr < 45) return 'bad';
    return 'avg';
}

function renderRanked(soloQ) {
    if (!soloQ) {
        return `<div class="card-ranked"><span class="rank-unranked">Brak rangi Solo/Duo</span></div>`;
    }

    const total = soloQ.wins + soloQ.losses;
    const wr = Math.round((soloQ.wins / total) * 100);
    const cls = renderWrColor(wr);
    const barColor = cls === 'good' ? '#1a9c5b' : cls === 'bad' ? '#c0392b' : '#9191a4';

    return `
    <div class="card-ranked">
      <div class="rank-info">
        <span class="rank-tier rank-${soloQ.tier}">${soloQ.tier} ${soloQ.rank}</span>
        <span class="rank-lp">${soloQ.lp} LP</span>
      </div>
      <div class="wr-block">
        <div class="wr-number ${cls}">${wr}%</div>
        <div class="wr-bar"><div class="wr-bar-fill" style="width:${wr}%;background:${barColor}"></div></div>
        <div class="wl-row"><span class="w">${soloQ.wins}W</span> <span class="l">${soloQ.losses}L</span> · ${total} gier</div>
      </div>
    </div>`;
}

function renderMatches(matches) {
    if (!matches || matches.length === 0) {
        return `<div class="card-matches"><p class="no-matches">Brak historii rankingowej</p></div>`;
    }

    const rows = matches.map(m => `
    <div class="match-row ${m.win ? 'win' : 'loss'}">
      <span class="match-result">${m.win ? 'W' : 'L'}</span>
      <span class="match-champ">${m.championName}</span>
      <span class="match-kda">${m.kills}/${m.deaths}/${m.assists}</span>
      <span class="match-cs">${m.cs} CS</span>
      <span class="match-time">${timeAgo(m.gameStartTimestamp)}</span>
    </div>`).join('');

    return `
    <div class="card-matches">
      <div class="matches-title">Ostatnie gry rankingowe</div>
      ${rows}
    </div>`;
}

function renderPlayer(player) {
    const iconUrl = player.profileIconId
        ? `https://ddragon.leagueoflegends.com/cdn/${DDRAGON}/img/profileicon/${player.profileIconId}.png`
        : null;

    const iconHtml = iconUrl
        ? `<img class="profile-icon" src="${iconUrl}" alt="" onerror="this.outerHTML='<div class=profile-icon-placeholder></div>'">`
        : `<div class="profile-icon-placeholder"></div>`;

    return `
    <article class="player-card">
      <div class="card-header">
        ${iconHtml}
        <div class="player-info">
          <div class="player-name">${player.gameName}<span class="tag"> #${player.tagLine}</span></div>
          <div class="player-level">Poziom ${player.summonerLevel}</div>
        </div>
        <a class="opgg-link" href="${opggUrl(player.gameName, player.tagLine)}" target="_blank" rel="noopener">op.gg ↗</a>
      </div>
      ${renderRanked(player.ranked)}
      ${renderMatches(player.matches)}
    </article>`;
}

function renderAll(players) {
    if (!players || players.length === 0) {
        app.innerHTML = `<div class="error">Brak danych graczy.</div>`;
        return;
    }

    app.innerHTML = `<div class="players-grid">${players.map(renderPlayer).join('')}</div>`;

    const ts = players.find(p => p.updatedAt)?.updatedAt;
    if (ts) {
        document.getElementById('last-updated').textContent =
            'Aktualizacja: ' + new Date(ts).toLocaleString('pl-PL');
    }
}

// ── init ─────────────────────────────────────────────────────

(async () => {
    try {
        const players = await loadData();
        renderAll(players);
    } catch (e) {
        app.innerHTML = `<div class="error">${e.message}</div>`;
    }
})();
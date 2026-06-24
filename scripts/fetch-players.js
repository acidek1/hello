const fs = require('fs');

const API_KEY = process.env.RIOT_API_KEY;
const PLATFORM = 'eun1';
const CLUSTER = 'europe';

const PLAYERS = [
    { gameName: 'GraczJeden', tagLine: 'EUNE' },
    { gameName: 'GraczDwa', tagLine: 'EUNE' },
    // dodaj kolejnych
];

async function riotFetch(url) {
    const res = await fetch(url, { headers: { 'X-Riot-Token': API_KEY } });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
}

async function processPlayer({ gameName, tagLine }) {
    console.log(`Fetching ${gameName}#${tagLine}...`);

    const account = await riotFetch(`https://${CLUSTER}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`);
    const summoner = await riotFetch(`https://${PLATFORM}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}`);
    const ranked = await riotFetch(`https://${PLATFORM}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}`);
    const matchIds = await riotFetch(`https://${CLUSTER}.api.riotgames.com/lol/match/v5/matches/by-puuid/${account.puuid}/ids?type=ranked&count=10`);

    const matches = [];
    for (const id of matchIds.slice(0, 7)) {
        const m = await riotFetch(`https://${CLUSTER}.api.riotgames.com/lol/match/v5/matches/${id}`);
        const p = m.info.participants.find(x => x.puuid === account.puuid);
        if (p) matches.push({
            win: p.win,
            championName: p.championName,
            kills: p.kills,
            deaths: p.deaths,
            assists: p.assists,
            cs: p.totalMinionsKilled + p.neutralMinionsKilled,
            gameStartTimestamp: m.info.gameStartTimestamp,
        });
        await new Promise(r => setTimeout(r, 100));
    }

    const soloQ = ranked.find(r => r.queueType === 'RANKED_SOLO_5x5') || null;

    return {
        gameName: account.gameName,
        tagLine: account.tagLine,
        profileIconId: summoner.profileIconId,
        summonerLevel: summoner.summonerLevel,
        ranked: soloQ ? {
            tier: soloQ.tier,
            rank: soloQ.rank,
            lp: soloQ.leaguePoints,
            wins: soloQ.wins,
            losses: soloQ.losses,
        } : null,
        matches,
        updatedAt: new Date().toISOString(),
    };
}

async function main() {
    const results = [];
    for (const player of PLAYERS) {
        try {
            results.push(await processPlayer(player));
        } catch (e) {
            console.error(`Error ${player.gameName}:`, e.message);
        }
    }
    fs.mkdirSync('data', { recursive: true });
    fs.writeFileSync('data/players.json', JSON.stringify(results, null, 2));
    console.log(`Saved ${results.length} players.`);
}

main();
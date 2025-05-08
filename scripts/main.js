// Configuration
const DATA_FILES = {
    players: 'data/Players.xlsx',
    selections: 'data/UserSelections.xlsx',
    ranks: 'data/PlayerRanks.xlsx'
};

// Global data storage
let appData = {
    players: [],
    userSelections: [],
    playerRanks: []
};

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadAllData();
        processData();
        displayLeaderboard();
        displayTopPerformers();
    } catch (error) {
        console.error("Error initializing application:", error);
        document.getElementById('loading').innerHTML = 
            `<div class="alert alert-danger">Error loading data. Please try again later.</div>`;
    }
});

// Data loading functions
async function loadAllData() {
    await Promise.all([
        loadExcelData(DATA_FILES.players, 'players'),
        loadExcelData(DATA_FILES.selections, 'userSelections'),
        loadExcelData(DATA_FILES.ranks, 'playerRanks')
    ]);
}

async function loadExcelData(filePath, dataKey) {
    try {
        const response = await fetch(filePath);
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet data
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        appData[dataKey] = XLSX.utils.sheet_to_json(firstSheet);
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error);
        throw error;
    }
}

// Data processing
function processData() {
    // Create player map for quick lookup
    const playerMap = {};
    appData.players.forEach(player => {
        playerMap[player.PlayerId] = {
            name: player.Name,
            role: player.Role,
            team: player.TeamName
        };
    });

    // Create rank map
    const rankMap = {};
    appData.playerRanks.forEach(rank => {
        rankMap[rank.PlayerId] = rank.Rank;
    });

    // Calculate user scores
    appData.userSelections.forEach(user => {
        user.totalScore = 0;
        user.teamDetails = [];
        
        const selectedPlayers = [
			user.Batter1, user.Batter2, user.Batter3, user.Batter4, user.Batter5,
			user.Wicketkeeper,
			user.Bowler1, user.Bowler2, user.Bowler3, user.Bowler4, user.Bowler5
		].filter(Boolean);

		selectedPlayers.forEach(playerId => {
			const player = playerMap[playerId];
			const rank = rankMap[playerId] || 0;

			user.totalScore += rank;
			user.teamDetails.push({
				name: player?.name || playerId,
				role: player?.role || '',
				rank: rank
			});
		});

    
    // Sort users by score
    appData.userSelections.sort((a, b) => b.totalScore - a.totalScore);
}

// Display functions
function displayLeaderboard() {
    const leaderboard = document.querySelector('#leaderboard tbody');
    const loading = document.getElementById('loading');
    
    // Clear existing rows
    leaderboard.innerHTML = '';
    
    // Display top 5 users
    const topUsers = appData.userSelections.slice(0, 5);
    topUsers.forEach((user, index) => {
        const row = document.createElement('tr');
        
        // Team composition tooltip
        const teamDetails = user.teamDetails.map(p => 
            `${p.name} (${p.role}, ${p.rank} pts)`
        ).join('<br>');
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${user.UserName}</td>
            <td>${user.totalScore}</td>
            <td>
                <span class="d-inline-block" tabindex="0" data-bs-toggle="tooltip" 
                    title="${teamDetails}">
                    <button class="btn btn-sm btn-outline-primary">View Team</button>
                </span>
            </td>
        `;
        leaderboard.appendChild(row);
    });
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(tooltipTriggerEl => {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Show table
    loading.classList.add('d-none');
    document.getElementById('leaderboard').classList.remove('d-none');
}

function displayTopPerformers() {
    const topPlayersContainer = document.getElementById('topPlayers');
    const loading = document.getElementById('topPlayersLoading');
    
    // Group players by role
    const playersByRole = {
        batter: [],
        wicketkeeper: [],
        bowler: []
    };
    
    appData.players.forEach(player => {
        const rankData = appData.playerRanks.find(r => r.PlayerId === player.PlayerId);
        if (rankData) {
            const playerWithRank = {
                ...player,
                rank: rankData.Rank
            };
            
            if (player.Role.toLowerCase().includes('batter')) {
                playersByRole.batter.push(playerWithRank);
            } else if (player.Role.toLowerCase().includes('wicketkeeper')) {
                playersByRole.wicketkeeper.push(playerWithRank);
            } else if (player.Role.toLowerCase().includes('bowler')) {
                playersByRole.bowler.push(playerWithRank);
            }
        }
    });
    
    // Sort and get top 3 for each role
    const topPerformers = {
        batters: playersByRole.batter.sort((a, b) => b.rank - a.rank).slice(0, 3),
        keepers: playersByRole.wicketkeeper.sort((a, b) => b.rank - a.rank).slice(0, 3),
        bowlers: playersByRole.bowler.sort((a, b) => b.rank - a.rank).slice(0, 3)
    };
    
    // Create HTML
    let html = `
        <h5>Top Batters</h5>
        <ul class="list-group mb-3">
            ${topPerformers.batters.map(p => `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${p.Name}
                    <span class="badge bg-primary rounded-pill">${p.rank}</span>
                </li>
            `).join('')}
        </ul>
        
        <h5>Top Wicketkeepers</h5>
        <ul class="list-group mb-3">
            ${topPerformers.keepers.map(p => `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${p.Name}
                    <span class="badge bg-success rounded-pill">${p.rank}</span>
                </li>
            `).join('')}
        </ul>
        
        <h5>Top Bowlers</h5>
        <ul class="list-group mb-3">
            ${topPerformers.bowlers.map(p => `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${p.Name}
                    <span class="badge bg-danger rounded-pill">${p.rank}</span>
                </li>
            `).join('')}
        </ul>
    `;
    
    topPlayersContainer.innerHTML = html;
    loading.classList.add('d-none');
    topPlayersContainer.classList.remove('d-none');
}
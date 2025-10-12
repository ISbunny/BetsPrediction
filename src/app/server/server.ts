import { Component } from '@angular/core';
import { AppService } from '../app-service';
import { environment } from '../environment';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-server',
  templateUrl: './server.html',
  styleUrl: './server.css',
  imports: [FormsModule, CommonModule],
})
export class Server {
  venueStats: any = null;
  userMatchId: string = '';
  matchID: number = 0;
  teamAName: string = '';
  teamAOdds: number = 0;
  teamBName: string = '';
  teamBOdds: number = 0;
  predictionResult: any = null;
  teamOptions: string[] = [];
  playing11TeamA: any = null;
  playing11TeamB: any = null;
  runRate: string = '';
  projected6: number | null = null;
  projected20: number | null = null;
  currentScore: string = '';
  constructor(private appService: AppService) {}

  ngOnInit() {
    this.fetchSeries();
  }
  // update here with venue stats
  fetchMatchPrediction(matchId: string): void {
    this.appService
      .getMatchPrediction(matchId, environment.rapidApiKey)
      .subscribe(
        (response) => {
          // console.log(response);
          this.matchID = response.matchid;
          const teamA = response.team1.teamname;
          const teamB = response.team2.teamname;
          this.teamOptions = [teamA, teamB];
          this.teamAName = teamA;
          this.teamBName = teamB;

          const venueId = response.venueinfo?.id || response.venue?.id || response.venueId;
          console.log('Venue ID found:', venueId);
          console.log('Venue info:', response.venueinfo);
          const proceedWithPrediction = (venueStats: any) => {
            this.venueStats = venueStats;
            // Continue with fetching playing 11 and prediction logic here
            // (move your playing 11 and prediction code inside this callback)

            // Fetch playing 11 for both teams and evaluate team strength only after both are loaded
            const teamAId = response.team1.teamid;
            const teamBId = response.team2.teamid;
            this.appService
              .getLiveScore(this.matchID, environment.rapidApiKey)
              .subscribe({
                next: (data) => {
                  // console.log('Live Score Data:', data);
                  const innings = data?.scorecard[0];
                  if (!innings) {
                    this.currentScore = 'Match not started';
                    return;
                  }

                  const runs = innings.score;
                  const wickets = innings.wickets;
                  const overs = innings.overs;

                  const rr = overs ? runs / overs : 0;
                  let proj6 = rr * 6;

                  // Fantasy-style adjustment
                  if (wickets === 0) proj6 *= 1.1; // boost
                  else if (wickets >= 2) proj6 *= 0.9; // penalty

                  // Full T20 projection
                  const proj20 = rr * 20;

                  this.currentScore = `${runs}/${wickets} in ${overs} overs`;
                  this.runRate = rr.toFixed(2);
                  this.projected6 = Math.round(proj6);
                  this.projected20 = Math.round(proj20);
                },
                error: (err) => {
                  console.error('❌ Error fetching score:', err);
                },
              });
            this.appService
              .getPlaying11TeamA(matchId, teamAId, environment.rapidApiKey)
              .subscribe(
                (dataA) => {
                  // console.log('data', dataA);
                  const squadAArray = dataA.player || dataA.players || [];
                  const playingXI =
                    squadAArray.find((g: any) => g.category === 'playing XI')
                      ?.player || [];
                  this.playing11TeamA = playingXI;
                  console.log(teamA + ' Playing XI:', playingXI);

                  this.appService
                    .getPlaying11TeamB(
                      matchId,
                      teamBId,
                      environment.rapidApiKey
                    )
                    .subscribe(
                      (dataB) => {
                        // console.log('data', dataB);
                        const squadBArray = dataB.player || dataB.players || [];
                        const playingXI =
                          squadBArray.find(
                            (g: any) => g.category === 'playing XI'
                          )?.player || [];
                        this.playing11TeamB = playingXI;
                        // console.log(teamB + ' Playing XI:', playingXI);
                        const tossStatus =
                          response.tossstatus || response.status || '';
                        let teamAIsBattingFirst = false;
                        let teamBIsBattingFirst = false;
                        // console.log('Raw tossStatus:', tossStatus);

                        if (tossStatus) {
                          // Example: "Durban Super Giants opt to bowl"
                          const match = tossStatus.match(
                            /^(.*?) opt to (bat|bowl)$/i
                          );
                          if (match) {
                            const tossWinner = match[1].trim();
                            const decision = match[2].trim();
                            // console.log('Parsed tossWinner:', tossWinner, 'Decision:', decision);
                            if (tossWinner === teamA) {
                              teamAIsBattingFirst = decision !== 'bowl';
                              teamBIsBattingFirst = !teamAIsBattingFirst;
                              // console.log(`${teamA} is batting first: ${teamAIsBattingFirst}`);
                            } else if (tossWinner === teamB) {
                              teamBIsBattingFirst = decision !== 'bowl';
                              teamAIsBattingFirst = !teamBIsBattingFirst;
                              // console.log(`${teamB} is batting first: ${teamBIsBattingFirst}`);
                            }
                          } else {
                            console.warn(
                              'Could not parse tossStatus:',
                              tossStatus
                            );
                          }
                        }
                        // Now both squads are loaded, evaluate team strengths
                        Promise.all([
                          this.fetchAndAttachPlayerStats(this.playing11TeamA),
                          this.fetchAndAttachPlayerStats(this.playing11TeamB),
                        ]).then(([teamAWithStats, teamBWithStats]) => {
                          const teamAScore = this.evaluateTeamStrength(
                            teamAWithStats,
                            this.venueStats,
                            /* isBattingFirst */ teamAIsBattingFirst,
                            teamA
                          );
                          const teamBScore = this.evaluateTeamStrength(
                            teamBWithStats,
                            this.venueStats,
                            /* isBattingFirst */ teamBIsBattingFirst,
                            teamB
                          );
                          // const scale = 0.2;
                          const [probA, probB] = this.softmax(
                            teamAScore,
                            teamBScore
                          );
                          const winChanceA = Math.round(probA * 100);
                          const winChanceB = Math.round(probB * 100);

                          const result = {
                            matchId,
                            seriesName: response.seriesname,
                            matchDesc: response.matchdesc,
                            teamA,
                            teamB,
                            winChance: {
                              [teamA]: winChanceA,
                              [teamB]: winChanceB,
                            },
                          };
                          this.predictionResult = result;
                          // console.log('Prediction Result:', this.predictionResult);
                        });
                      },
                      (error) => {
                        console.error(
                          'Error fetching team squad for Team B:',
                          error
                        );
                      }
                    );
                },
                (error) => {
                  console.error('Error fetching playing 11 for Team A:', error);
                }
              );
          };

          if (venueId) {
            console.log('Fetching venue stats for ID:', venueId);
            this.appService
              .getVenueStats(venueId, environment.rapidApiKey)
              .subscribe(
                (venueStatsResp) => {
                  proceedWithPrediction(venueStatsResp.venueStats || []);
                },
                (error) => {
                  console.error('Error fetching venue stats:', error);
                  proceedWithPrediction(null);
                }
              );
          } else {
            proceedWithPrediction(null);
          }
        },
        (error) => {
          console.error('Error fetching match prediction:', error);
        }
      );
  }

  onFetchPrediction() {
    if (!this.userMatchId) {
      alert('Please enter a valid Match ID.');
      return;
    }
    this.fetchMatchPrediction(this.userMatchId);
  }
  WEIGHTS = {
    captain: 8,
    keeper: 6,
    overseas: 4,
    battingAllrounder: 5,
    bowlingAllrounder: 5,
    batsman: 3,
    bowler: 3,
    wkBatsman: 4,
  };

  // Team strength calculation based on available fields
  evaluateTeamStrength(
    players: any[],
    venueStats?: any,
    isBattingFirst?: boolean,
    teamName?: string
  ): number {
    let score = 0;
    for (const player of players) {
      // console.log(`Evaluating player:`, player);
      let playerScore = 0;
      if (player.captain) playerScore += this.WEIGHTS.captain;
      if (player.keeper) playerScore += this.WEIGHTS.keeper;
      if (player.isoverseas) playerScore += this.WEIGHTS.overseas;

      // Use player stats if available
      if (
        typeof player.battingAverage === 'number' &&
        player.battingAverage > 0
      ) {
        playerScore += player.battingAverage * 0.2; // weight for batting average
      }
      if (typeof player.strikeRate === 'number' && player.strikeRate > 0) {
        playerScore += player.strikeRate * 0.05; // weight for strike rate
      }
      if (
        typeof player.bowlingAverage === 'number' &&
        player.bowlingAverage > 0
      ) {
        playerScore += (50 - player.bowlingAverage) * 0.2; // lower avg is better
      }
      if (typeof player.economyRate === 'number' && player.economyRate > 0) {
        playerScore += (10 - player.economyRate) * 0.5; // lower econ is better
      }

      if (typeof player.role === 'string') {
        const role = player.role.toLowerCase();
        if (role.includes('batting allrounder'))
          playerScore += this.WEIGHTS.battingAllrounder;
        if (role.includes('bowling allrounder'))
          playerScore += this.WEIGHTS.bowlingAllrounder;
        if (role.includes('wk-batsman')) playerScore += this.WEIGHTS.wkBatsman;
        if (
          role.includes('batsman') &&
          !role.includes('allrounder') &&
          !role.includes('wk-batsman')
        )
          playerScore += this.WEIGHTS.batsman;
        if (role.includes('bowler') && !role.includes('allrounder'))
          playerScore += this.WEIGHTS.bowler;
      }

      score += playerScore;
    }

    console.log(
      `[${teamName || 'Team'}] Score after player stats/roles:`,
      score
    );
    console.log('venueStats parameter:', venueStats);
    console.log('this.venueStats:', this.venueStats);
    console.log('venueStats truthy check:', !!venueStats);
    // Venue/toss influence
    if (venueStats) {
      
      const matchesWonBatFirst = this.parseVenueStat(
        'Matches won batting first'
      );
      console.log('Matches won batting first:', matchesWonBatFirst);
      const matchesWonBowlFirst = this.parseVenueStat(
        'Matches won bowling first'
      );
      if (matchesWonBatFirst !== null && matchesWonBowlFirst !== null) {
        const total = matchesWonBatFirst + matchesWonBowlFirst;
        if (total > 0) {
          const batFirstWinPct = matchesWonBatFirst / total;
          if (isBattingFirst && batFirstWinPct > 0.5) {
            // Bonus for batting first if batting first is favored
            score *= 1.03;
          }
          if (!isBattingFirst && batFirstWinPct < 0.5) {
            // Bonus for bowling first if bowling first is favored
            score *= 1.03;
          }
          if (isBattingFirst && batFirstWinPct < 0.5) {
            // Penalty for batting first if bowling first is favored
            score *= 0.97;
          }
          if (!isBattingFirst && batFirstWinPct > 0.5) {
            // Penalty for bowling first if batting first is favored
            score *= 0.97;
          }
        }
      }
      const avgScores = this.venueStats.find(
        (s: any) => s.key === 'Avg. scores recorded'
      );
      console.log('Avg Scores Stat:', avgScores);
      if (avgScores) {
  const match1st = avgScores.value.match(/1st inns-(\d+)/);
  const match2nd = avgScores.value.match(/2nd inns-(\d+)/);
  
  if (isBattingFirst && match1st) {
    const avg1stInns = parseInt(match1st[1], 10);
    score += avg1stInns * 0.01;
    console.log(`[${teamName}] Venue avg 1st inns bonus: +${avg1stInns * 0.01}`);
  } else if (!isBattingFirst && match2nd) {
    const avg2ndInns = parseInt(match2nd[1], 10);
    score += avg2ndInns * 0.01;
    console.log(`[${teamName}] Venue avg 2nd inns bonus: +${avg2ndInns * 0.01}`);
  }
}
    }

    console.log(`[${teamName || 'Team'}] Final score after venue/toss:`, score);
    return score;
  }

  softmax(a: number, b: number): [number, number] {
    const expA = Math.exp(a);
    const expB = Math.exp(b);
    const sum = expA + expB;
    return [expA / sum, expB / sum];
  }

  hardWinChance(a: number, b: number): [number, number] {
    if (a === b) return [50, 50];
    return a > b ? [100, 0] : [0, 100];
  }

  fetchSeries(): void {
    this.appService.GetSeriesArchieve(2025, environment.rapidApiKey).subscribe(
      (response) => {
        // console.log('Series Archive Response:', response);
      },
      (error) => {
        console.error('Error fetching series archive:', error);
      }
    );
  }

  async fetchAndAttachPlayerStats(players: any[]): Promise<any[]> {
    const apiKey = environment.rapidApiKey;
    for (const player of players) {
      try {
        const battingStatsRaw = await this.appService
          .getPlayerBattingStats(player.id, apiKey)
          .toPromise();
        await delay(300); // 300ms delay to avoid rate limit
        const bowlingStatsRaw = await this.appService
          .getPlayerBowlingStats(player.id, apiKey)
          .toPromise();
        await delay(300);

        const battingStats = battingStatsRaw as any;
        const bowlingStats = bowlingStatsRaw as any;

        // console.log(`Bowling stats raw for ${player.name}:`, bowlingStatsRaw);

        const batHeaders = battingStats?.headers || [];
        const t20BatIdx = batHeaders.indexOf('T20');
        if (t20BatIdx > -1) {
          for (const row of battingStats.values) {
            if (row.values[0] === 'Average') {
              player.battingAverage = parseFloat(row.values[t20BatIdx]) || 0;
            }
            if (row.values[0] === 'SR') {
              player.strikeRate = parseFloat(row.values[t20BatIdx]) || 0;
            }
          }
        }

        const bowlHeaders = bowlingStats?.headers || [];
        const t20BowlIdx = bowlHeaders.indexOf('T20');
        if (t20BowlIdx > -1) {
          for (const row of bowlingStats.values) {
            if (row.values[0] === 'Avg') {
              player.bowlingAverage = parseFloat(row.values[t20BowlIdx]) || 0;
            }
            if (row.values[0] === 'Eco') {
              player.economyRate = parseFloat(row.values[t20BowlIdx]) || 0;
            }
          }
        }

        // console.log(
        //   `Stats for ${player.name}: BatAvg=${player.battingAverage}, SR=${player.strikeRate}, BowlAvg=${player.bowlingAverage}, Econ=${player.economyRate}`
        // );
      } catch (e) {
        console.warn(`Stats not found for player ${player.name}:`, e);
      }
    }
    return players;
  }

  parseVenueStat(key: string): number | null {
    if (!this.venueStats) return null;
    const stat = this.venueStats.find((s: any) => s.key === key);
    if (!stat) return null;
    // Extract first number found in the value string
    const match = stat.value.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

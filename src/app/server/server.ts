import { Component } from '@angular/core';
import { AppService } from '../app-service';
import { environment } from '../environment';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-server',
  templateUrl: './server.html',
  styleUrl: './server.css',
  imports: [FormsModule,CommonModule],
})
export class ServerComponent {
  userMatchId: string = '';
  teamAName: string = '';
  teamAOdds: number = 0;
  teamBName: string = '';
  teamBOdds: number = 0;
  predictionResult: any = null;
  teamOptions: string[] = [];
  constructor(private appService: AppService) {}

  ngOnInit() {
    // Optionally call with default values or let user trigger
    // this.onFetchPrediction();
  }
// update here with venue stats
  fetchMatchPrediction(matchId: string, marketOdds: { [key: string]: number } = {}): void {
    this.appService.getMatchPrediction(matchId, environment.rapidApiKey)
      .subscribe(response => {
        // console.log('API Response:', response); // Debug line
        const info = response.matchInfo;
        const teamA = info.team1.name;
        const teamB = info.team2.name;
        this.teamOptions = [teamA, teamB];
        // If not set, set default selected teams
        if (!this.teamAName) this.teamAName = teamA;
        if (!this.teamBName) this.teamBName = teamB;
        const playersA = info.team1?.playerDetails || [];
        console.log('Team A Players:', playersA);
        const playersB = info.team2?.playerDetails || [];
        console.log('Team B Players:', playersB);
        // Evaluate strengths using robust formula and softmax
        const teamAScore = this.evaluateTeamStrength(playersA);
        const teamBScore = this.evaluateTeamStrength(playersB);
        const [probA, probB] = this.softmax(teamAScore, teamBScore);
        const winChanceA = Math.round(probA * 100);
        const winChanceB = Math.round(probB * 100);
        // Use dynamic marketOdds from parameter
        const marketProbA = marketOdds[teamA] ? Math.round((1 / marketOdds[teamA]) * 10000 / ((1 / marketOdds[teamA]) + (1 / marketOdds[teamB]))) / 100 : null;
        const marketProbB = (marketOdds[teamB] && marketProbA !== null) ? 100 - marketProbA : null;
        // Detect value bets
        const valueBets: any[] = [];
        if (marketProbA !== null && winChanceA > marketProbA + 1) {
          valueBets.push({
            team: teamA,
            reason: `Model gives ${winChanceA}%, market gives ${marketProbA}%`
          });
        }
        if (marketProbB !== null && winChanceB > marketProbB + 6) {
          valueBets.push({
            team: teamB,
            reason: `Model gives ${winChanceB}%, market gives ${marketProbB}%`
          });
        }
        const result = {
          matchId,
          seriesName: info.series.name,
          matchDesc: info.matchDescription,
          teamA,
          teamB,
          winChance: {
            [teamA]: winChanceA,
            [teamB]: winChanceB
          },
          marketOdds,
          valueBets
        };
        this.predictionResult = result;
      }, error => {
        console.error('Error fetching match prediction:', error);
      });
  }

  onFetchPrediction() {
    if (!this.userMatchId) {
      alert('Please enter a valid Match ID.');
      return;
    }
    const marketOdds = {
      [this.teamAName]: this.teamAOdds,
      [this.teamBName]: this.teamBOdds
    };
    this.fetchMatchPrediction(this.userMatchId, marketOdds);
  }

WEIGHTS = {
    substitute: 10,
    captain: 5,
    keeper: 4,
    battingStyle: 3,
    bowlingStyle: 3,
    runs: 0.05,      // 0.05 points per run
    wickets: 0.5     // 0.5 points per wicket
  };

  // More robust team strength calculation using weights
  evaluateTeamStrength(players: any[]): number {
    let score = 0;
    for (const player of players) {
      let playerScore = 0;
      if (player.substitute) playerScore += this.WEIGHTS.substitute;
      if (player.captain) playerScore += this.WEIGHTS.captain;
      if (player.keeper) playerScore += this.WEIGHTS.keeper;
      if (player.battingStyle) playerScore += this.WEIGHTS.battingStyle;
      if (player.bowlingStyle) playerScore += this.WEIGHTS.bowlingStyle;
      if (player?.seasonalStats) {
        const stats = player.seasonalStats;
        if (stats.batting?.runs) {
          const runs = parseInt(stats.batting.runs);
          playerScore += runs * this.WEIGHTS.runs;
        }
        if (stats.bowling?.wickets) {
          const wickets = parseInt(stats.bowling.wickets);
          playerScore += wickets * this.WEIGHTS.wickets;
        }
      }
      score += playerScore;
    }
    return score;
  }

  softmax(a: number, b: number): [number, number] {
    const expA = Math.exp(a);
    const expB = Math.exp(b);
    const sum = expA + expB;
    return [expA / sum, expB / sum];
  }
}

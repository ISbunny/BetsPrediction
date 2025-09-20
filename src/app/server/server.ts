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
export class Server {
  userMatchId: string = '';
  matchID: any;
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

  ngOnInit() {}
// update here with venue stats
  fetchMatchPrediction(matchId: string): void {
    this.appService.getMatchPrediction(matchId, environment.rapidApiKey)
      .subscribe(response => {
        // console.log(response);
        this.matchID = response.matchid;
        const teamA = response.team1.teamname;
        const teamB = response.team2.teamname;
        this.teamOptions = [teamA, teamB];
        this.teamAName = teamA;
        this.teamBName = teamB;

        // Fetch playing 11 for both teams and evaluate team strength only after both are loaded
        const teamAId = response.team1.teamid;
        const teamBId = response.team2.teamid;
        this.appService.getLiveScore(this.matchID, environment.rapidApiKey).subscribe({
      next: (data) => {
        console.log('Live Score Data:', data);
        const innings = data?.scorecard[0];
        if (!innings) {
          this.currentScore = 'Match not started';
          return;
        }

        const runs = innings.score;
        const wickets = innings.wickets;
        const overs = innings.overs;

        const rr = runs / (overs || 1);
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
      }
    });
        this.appService.getPlaying11TeamA(matchId, teamAId, environment.rapidApiKey).subscribe(dataA => {
          // console.log('data',dataA);
          
          // Use the entire squad (playing XI + bench) for team strength evaluation
          const squadA = [
            ...(dataA.players?.["playing XI"] || []),
            ...(dataA.players?.bench || [])
          ];
          // full team squadA based on team structure
          // const squadA = Array.isArray(dataA.players?.Squad) ? dataA.players.Squad : [];
          // console.log('Team A Squad:', squadA);
          this.playing11TeamA = squadA;
          console.log(teamA + ' Squad:', squadA);

          this.appService.getPlaying11TeamB(matchId, teamBId, environment.rapidApiKey).subscribe(dataB => {
            const squadB = [
              ...(dataB.players?.["playing XI"] || []),
              ...(dataB.players?.bench || [])
            ];
            // Full Team SquadB
            // const squadB = Array.isArray(dataB.players?.Squad) ? dataB.players.Squad : [];
            this.playing11TeamB = squadB;
            console.log(teamB + ' Squad:', squadB);

            // Now both squads are loaded, evaluate team strengths
            const teamAScore = this.evaluateTeamStrength(this.playing11TeamA);
            // console.log('Team A Score:', teamAScore);
            const teamBScore = this.evaluateTeamStrength(this.playing11TeamB);
            // console.log('Team B Score:', teamBScore);
            const [probA, probB] = this.softmax(teamAScore, teamBScore);
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
                [teamB]: winChanceB
              },
          
            };
            this.predictionResult = result;
            // console.log('Prediction Result:', this.predictionResult);
          }, error => {
            console.error('Error fetching team squad for Team B:', error);
          });
        }, error => {
          console.error('Error fetching playing 11 for Team A:', error);
        });
      }, error => {
        console.error('Error fetching match prediction:', error);
      });
  }

  onFetchPrediction() {
    if (!this.userMatchId) {
      alert('Please enter a valid Match ID.');
      return;
    }
    this.fetchMatchPrediction(this.userMatchId);
  }
WEIGHTS = {
    substitute: 10,
    captain: 5,
    keeper: 4,
    battingStyle: 3,
    bowlingStyle: 3,
    runs: 0.05,      // 0.05 points per run
    wickets: 0.5,
    battingAllrounder: 2,
    bowlingAllrounder: 2,     // 0.5 points per wicket
  };

  // More robust team strength calculation using weights
  evaluateTeamStrength(players: any[]): number {
    // Improved team strength calculation using player stats from Cricbuzz API
    let score = 0;
    for (const player of players) {
      let playerScore = 0;
      if (player.captain) playerScore += this.WEIGHTS.captain;
      if (player.keeper) playerScore += this.WEIGHTS.keeper;
      if (player.substitute===false) playerScore += this.WEIGHTS.substitute;
      if (player.battingStyle) playerScore += this.WEIGHTS.battingStyle;
      if (player.bowlingStyle) playerScore += this.WEIGHTS.bowlingStyle;
      
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

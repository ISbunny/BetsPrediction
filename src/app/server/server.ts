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
  teamAName: string = '';
  teamAOdds: number = 0;
  teamBName: string = '';
  teamBOdds: number = 0;
  predictionResult: any = null;
  teamOptions: string[] = [];
  playing11TeamA: any = null;
  playing11TeamB: any = null;
  constructor(private appService: AppService) {}

  ngOnInit() {
    // Optionally call with default values or let user trigger
    // this.onFetchPrediction();
  }
// update here with venue stats
  fetchMatchPrediction(matchId: string): void {
    this.appService.getMatchPrediction(matchId, environment.rapidApiKey)
      .subscribe(response => {
        const teamA = response.team1.teamname;
        const teamB = response.team2.teamname;
        this.teamOptions = [teamA, teamB];
        if (!this.teamAName) this.teamAName = teamA;
        if (!this.teamBName) this.teamBName = teamB;

        // Fetch playing 11 for both teams and evaluate team strength only after both are loaded
        const teamAId = response.team1.teamid;
        const teamBId = response.team2.teamid;

        this.appService.getPlaying11TeamA(matchId, teamAId, environment.rapidApiKey).subscribe(dataA => {
          
          // Use the entire squad (playing XI + bench) for team strength evaluation
          const squadA = [
            ...(dataA.players?.["playing XI"] || []),
            ...(dataA.players?.bench || [])
          ];
          this.playing11TeamA = squadA;
          console.log('Team A Squad:', squadA);

          this.appService.getPlaying11TeamB(matchId, teamBId, environment.rapidApiKey).subscribe(dataB => {
            const squadB = [
              ...(dataB.players?.["playing XI"] || []),
              ...(dataB.players?.bench || [])
            ];
            this.playing11TeamB = squadB;
            console.log('Team B Squad:', squadB);

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

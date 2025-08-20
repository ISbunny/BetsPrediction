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
  teamID: number = 582; // Set a valid teamID here
  teamOptions: string[] = [];
  seasonId: number = 1702; // Set a valid seasonId here
  fixtureId: number = 65372; // Set a valid fixtureId here
  playerID: number = 134; // Set a valid playerID here
  venueID: number = 23; // Set a valid venueID here
  constructor(private appService: AppService) {}

  ngOnInit() {
    // Optionally call with default values or let user trigger
    // this.onFetchPrediction();
    if (this.seasonId) {
      this.getAllFixtures(this.seasonId);
    } else {
      console.error('seasonId is undefined!');
    }
    if (this.fixtureId) {
      this.getFixtureById(this.fixtureId);
    }
    if (this.teamID) {
      this.getTeamById(this.teamID);
    }
    if (this.playerID) {
      this.getPlayerById(this.playerID);
    }
    if (this.venueID) {
      this.getVenueById(this.venueID);
    }
    if (this.seasonId) {
      this.getTeamStandings(this.seasonId);
    } else {
      console.error('seasonId is undefined!');
    }
    if (this.fixtureId) {
      this.getFixtureWithRuns(this.fixtureId);
    }
  }
  // Get all the fixture
  getAllFixtures(seasonId: number): void {
    this.appService.getFixtures(seasonId)
      .subscribe(response => {
        console.log('Fixtures:', response);
      }, error => {
        console.error('Error fetching fixtures:', error);
      });
  }

  // Get Fixture with FixtureID
  getFixtureById(fixtureId: number): void {
    this.appService.getFixtureById(fixtureId)
      .subscribe(response => {
        console.log('Fixture:', response);
      }, error => {
        console.error('Error fetching fixture:', error);
      });
  }
// Get Teams with TeamID
  getTeamById(teamId: number): void {
    this.appService.getTeamById(teamId)
      .subscribe(response => {
        console.log('Team:', response);
      }, error => {
        console.error('Error fetching team:', error);
      });
  }
// Get Players With PlayersID
  getPlayerById(playerId: number): void {
    this.appService.getPlayerById(playerId)
      .subscribe(response => {
        console.log('Player:', response);
      }, error => {
        console.error('Error fetching player:', error);
      });
  }
// Get Venue With VenueID
  getVenueById(venueId: number): void {
    this.appService.getVenueById(venueId)
      .subscribe(response => {
        console.log('Venue:', response);
      }, error => {
        console.error('Error fetching venue:', error);
      });
  }
  // Get Team Standing with SeasonID
  getTeamStandings(seasonId: number): void {
    this.appService.getTeamStandings(seasonId)
      .subscribe(response => {
        console.log('Team Standings:', response);
      }, error => {
        console.error('Error fetching team standings:', error);
      });
  }
  
  // Get Fixture with FixtureID with runs
  getFixtureWithRuns(fixtureId: number): void {
    this.appService.getFixtureWithRuns(fixtureId)
      .subscribe(response => {
        console.log('Fixture Runs:', response);
      }, error => {
        console.error('Error fetching fixture runs:', error);
      });
  }
// Fetch Match Predition from calculation

  // fetchMatchPrediction(matchId: string, marketOdds: { [key: string]: number } = {}): void {
  //   this.appService.getMatchPrediction(matchId, environment.rapidApiKey)
  //     .subscribe(response => {
  //       // console.log('API Response:', response); // Debug line
  //       const info = response.matchInfo;
  //       const teamA = info.team1.name;
  //       const teamB = info.team2.name;
  //       this.teamOptions = [teamA, teamB];
  //       // If not set, set default selected teams
  //       if (!this.teamAName) this.teamAName = teamA;
  //       if (!this.teamBName) this.teamBName = teamB;
  //       const playersA = info.team1?.playerDetails || [];
  //       const playersB = info.team2?.playerDetails || [];
  //       // Evaluate strengths
  //       const teamAScore = Number(this.evaluateTeamStrength(playersA));
  //       const teamBScore = Number(this.evaluateTeamStrength(playersB));
  //       const winChanceA = Math.round((teamAScore / (teamAScore + teamBScore)) * 100);
  //       const winChanceB = 100 - winChanceA;
  //       // Use dynamic marketOdds from parameter
  //       const marketProbA = marketOdds[teamA] ? Math.round((1 / marketOdds[teamA]) * 10000 / ((1 / marketOdds[teamA]) + (1 / marketOdds[teamB]))) / 100 : null;
  //       const marketProbB = (marketOdds[teamB] && marketProbA !== null) ? 100 - marketProbA : null;
  //       // Detect value bets
  //       const valueBets: any[] = [];
  //       if (marketProbA !== null && winChanceA > marketProbA + 1) {
  //         valueBets.push({
  //           team: teamA,
  //           reason: `Model gives ${winChanceA}%, market gives ${marketProbA}%`
  //         });
  //       }
  //       if (marketProbB !== null && winChanceB > marketProbB + 6) {
  //         valueBets.push({
  //           team: teamB,
  //           reason: `Model gives ${winChanceB}%, market gives ${marketProbB}%`
  //         });
  //       }
  //       // Final result
  //       const result = {
  //         matchId,
  //         seriesName: info.series.name,
  //         matchDesc: info.matchDescription,
  //         teamA,
  //         teamB,
  //         winChance: {
  //           [teamA]: winChanceA,
  //           [teamB]: winChanceB
  //         },
  //         marketOdds,
  //         valueBets
  //       };
  //       this.predictionResult = result;
  //     }, error => {
  //       console.error('Error fetching match prediction:', error);
  //     });
  // }

  // onFetchPrediction() {
  //   if (!this.userMatchId) {
  //     alert('Please enter a valid Match ID.');
  //     return;
  //   }
  //   const marketOdds = {
  //     [this.teamAName]: this.teamAOdds,
  //     [this.teamBName]: this.teamBOdds
  //   };
  //   this.fetchMatchPrediction(this.userMatchId, marketOdds);
  // }

  evaluateTeamStrength(players: any[]): string {
    let score = 0;
    for (const player of players) {
      let playerScore = 0;
      if (player.playing11) playerScore += 10;
      if (player.isCaptain) playerScore += 5;
      if (player.isKeeper) playerScore += 4;
      if (player.battingStyle) playerScore += 3;
      if (player.bowlingStyle) playerScore += 3;
      if (player?.seasonalStats) {
        const stats = player.seasonalStats;
        if (stats.batting?.runs) {
          const runs = parseInt(stats.batting.runs);
          playerScore += Math.min(runs / 10, 10);
        }
        if (stats.bowling?.wickets) {
          const wickets = parseInt(stats.bowling.wickets);
          playerScore += Math.min(wickets * 1.5, 10);
        }
      }
      score += playerScore;
    }
    return score.toString();
  }
}

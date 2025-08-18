import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AppService } from '../app-service';
@Component({
  selector: 'app-server',
  templateUrl: './server.html',
  styleUrls: ['./server.css'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class Server {
  matchId: any;   // put target matchId here
  leagueId: any;    // target league id
  seasonId: any;    // season id for the league

  team1: any;
  team2: any;
  playingXI: any;
  standings: any;
  h2h: any;
  venue: any;

  winProbability: { team1: number; team2: number } = { team1: 0, team2: 0 };
  team1Position: number | null = null;
  team2Position: number | null = null;

  constructor(private appService: AppService) {}

  ngOnInit() {
    this.loadMatchData();
    this.appService.getMatchesByLeague(this.leagueId).subscribe(matches => {
      console.log('Matches by League:', matches);
    });
  }

  async loadMatchData() {
    try {
      // 1) Get Match Info (teams + venue)
      const match: any = await this.appService
        .getMatchLineup(this.matchId)
        .toPromise();

      this.team1 = match.data.localteam;
      this.team2 = match.data.visitorteam;
      this.playingXI = match.data.lineup;
      this.venue = match.data.venue;

      // 2) Get Head-to-Head
      this.h2h = await this.appService
        .getHeadToHead(this.team1.id, this.team2.id)
        .toPromise();

      // 3) Get Standings
      this.standings = await this.appService
        .getLeagueStandings(this.seasonId)
        .toPromise();

      // Set team positions for template
      if (this.standings && this.standings.data) {
        const t1 = this.standings.data.find((s: any) => s.team_id === this.team1.id);
        const t2 = this.standings.data.find((s: any) => s.team_id === this.team2.id);
        this.team1Position = t1 ? t1.position : null;
        this.team2Position = t2 ? t2.position : null;
      }

      // 4) Calculate Probability
      this.calculateWinningProbability();

    } catch (err) {
      console.error('Error loading match data', err);
    }
  }

  calculateWinningProbability() {
    let scoreTeam1 = 0;
    let scoreTeam2 = 0;

    // ✅ Head-to-Head Weight
    if (this.h2h && this.h2h.data) {
      const h2hTeam1Wins = this.h2h.data.localteam_wins;
      const h2hTeam2Wins = this.h2h.data.visitorteam_wins;
      if (h2hTeam1Wins > h2hTeam2Wins) scoreTeam1 += 20;
      else if (h2hTeam2Wins > h2hTeam1Wins) scoreTeam2 += 20;
    }

    // ✅ Current League Standing Weight
    const team1Standing = this.standings.data.find((s: any) => s.team_id === this.team1.id);
    const team2Standing = this.standings.data.find((s: any) => s.team_id === this.team2.id);
    if (team1Standing && team2Standing) {
      if (team1Standing.position < team2Standing.position) scoreTeam1 += 25;
      else scoreTeam2 += 25;
    }

    // ✅ Venue Advantage
    if (this.venue && this.venue.data) {
      // simplistic: assume home advantage
      if (this.venue.data.country_id === this.team1.country_id) scoreTeam1 += 10;
      if (this.venue.data.country_id === this.team2.country_id) scoreTeam2 += 10;
    }

    // ✅ Player Performance Weight (simplified: based on total runs in last matches)
    if (this.playingXI) {
      const avgRunsTeam1 = this.playingXI
        .filter((p: any) => p.lineup.team_id === this.team1.id)
        .reduce((sum: number, p: any) => sum + (p.season?.runs || 20), 0) / 11;

      const avgRunsTeam2 = this.playingXI
        .filter((p: any) => p.lineup.team_id === this.team2.id)
        .reduce((sum: number, p: any) => sum + (p.season?.runs || 20), 0) / 11;

      if (avgRunsTeam1 > avgRunsTeam2) scoreTeam1 += 20;
      else scoreTeam2 += 20;
    }

    // ✅ Final Normalization
    const total = scoreTeam1 + scoreTeam2;
    this.winProbability = {
      team1: Math.round((scoreTeam1 / total) * 100),
      team2: Math.round((scoreTeam2 / total) * 100)
    };
  }
}


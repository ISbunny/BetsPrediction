
import { Component, TemplateRef, ViewChild } from '@angular/core';
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
  seasonId: number = 1711;    // season id for the league

  team1: any;
  team2: any;
  playingXI: any;
  standings: any;
  h2h: any;
  venue: any;
  upcomingMatches: any[] = [];
  @ViewChild('loading', { static: true }) loading!: TemplateRef<any>;
  winProbability: { team1: number; team2: number } = { team1: 0, team2: 0 };
  team1Position: number | null = null;
  team2Position: number | null = null;

  // upcomingMatches: any[] = [];

  constructor(private appService: AppService) {}

  ngOnInit() {
    console.log('ngOnInit called, seasonId:', this.seasonId);
    if (this.seasonId) {
      this.loadUpcomingMatches();
    } else {
      console.warn('seasonId is not set, not loading matches');
    }
  }

  loadUpcomingMatches() {
  this.appService.getSeasonFixtures(this.seasonId).subscribe({
    next: (res: any) => {
      console.log('Season fixtures response:', res);
      this.upcomingMatches = (res.data.fixtures || []).filter((f: any) => f.status === 'NS');
      console.log('Filtered upcoming matches:', this.upcomingMatches);
    },
    error: (err) => {
      console.error('Error loading upcoming matches', err);
      this.upcomingMatches = [];
    }
  });
}

  async loadMatchData() {
    try {
      // 1) Get Match Info (teams + venue)
      const match: any = await this.appService
        .getMatchLineup(this.matchId)
        .toPromise();
      console.log('Match lineup response:', match);

      this.team1 = match.data.localteam;
      this.team2 = match.data.visitorteam;
      this.playingXI = match.data.lineup;
      this.venue = match.data.venue;

      // 2) Get Head-to-Head
      this.h2h = await this.appService
        .getHeadToHead(this.team1.id, this.team2.id)
        .toPromise();
      console.debug('Head-to-head response:', this.h2h);

      // 3) Get Standings
      this.standings = await this.appService
        .getLeagueStandings(this.seasonId)
        .toPromise();
      console.log('League standings response:', this.standings);

      // Set team positions for template
      if (this.standings && this.standings.data) {
        const t1 = this.standings.data.find((s: any) => s.team_id === this.team1.id);
        const t2 = this.standings.data.find((s: any) => s.team_id === this.team2.id);
        this.team1Position = t1 ? t1.position : null;
        this.team2Position = t2 ? t2.position : null;
        console.log('Team positions:', { team1Position: this.team1Position, team2Position: this.team2Position });
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


import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from './environment';
// import { environment } from './environment'; // Adjust the import path as necessary

@Injectable({
  providedIn: 'root'
})
export class AppService {
  private baseUrl = environment.sportmonksApiUrl;
  private token = environment.sportmonksToken;
   constructor(private http: HttpClient) {}

  getMatchInfo(matchId: number) {
    return this.http.get(`${this.baseUrl}/fixtures/${matchId}?api_token=${this.token}&include=localteam,visitorteam,venue`);
  }

  getPlayingXI(matchId: number) {
    return this.http.get(`${this.baseUrl}/fixtures/${matchId}?api_token=${this.token}&include=lineup`);
  }

  getHeadToHead(teamId1: number, teamId2: number) {
  return this.http.get(`${this.baseUrl}/head-to-head/${teamId1}/${teamId2}?api_token=${this.token}`);
}


  getLeagueStandings(seasonId: number) {
    return this.http.get(`${this.baseUrl}/standings/season/${seasonId}?api_token=${this.token}`);
  }

  getPlayerStats(playerId: number) {
    return this.http.get(`${this.baseUrl}/players/${playerId}?api_token=${this.token}&include=career,statistics`);
  }

  getVenueInfo(venueId: number) {
    return this.http.get(`${this.baseUrl}/venues/${venueId}?api_token=${this.token}`);
  }

  getLiveScore(matchId: number) {
    return this.http.get(`${this.baseUrl}/fixtures/${matchId}?api_token=${this.token}&include=scoreboards`);
  }
   getMatchesByLeague(leagueId: number) {
    return this.http.get(`${this.baseUrl}/matches?include=league,season,venue&leagues=${leagueId}&api_token=${this.token}`);
  }

  getMatchLineup(matchId: number) {
    return this.http.get(`${this.baseUrl}/matches/${matchId}?include=lineup&api_token=${this.token}`);
  }

  /**
   * Get upcoming matches (next 10 by date)
   */
  getUpcomingMatches(leagueId?: number): Observable<any> {
    let url = `${this.baseUrl}/fixtures?api_token=${this.token}&sort=date&include=localteam,visitorteam,league,venue`;
    if (leagueId) {
      url += `&leagues=${leagueId}`;
    }
    url += `&status=NS&per_page=10`;
    return this.http.get(url);
  }
  getSeasonFixtures(seasonId: number): Observable<any> {
  const url = `${environment.proxyApiUrl}/seasons/${seasonId}`;
  return this.http.get(url);
}
}
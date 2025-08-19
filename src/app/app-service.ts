import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from './environment'; // Adjust the import path as necessary

@Injectable({
  providedIn: 'root'
})
export class AppService {
   constructor(private http: HttpClient) {}

  // get all the fixture using sportmonks
  getFixtures(seasonId: number): Observable<any> {
    return this.http.get(`${environment.SPORTMONKS_BASE}/seasons/${seasonId}?api_token=${environment.SPORTMONKS_API_TOKEN}`);
  }
  // Get Fixture with FixtureID
  getFixtureById(fixtureId: number): Observable<any> {
    return this.http.get(`${environment.SPORTMONKS_BASE}/fixtures/${fixtureId}?api_token=${environment.SPORTMONKS_API_TOKEN}`);
  }
  // Get Teams with TeamID
  getTeamById(teamId: number): Observable<any> {
    return this.http.get(`${environment.SPORTMONKS_BASE}/teams/${teamId}?api_token=${environment.SPORTMONKS_API_TOKEN}`);
  }
  // Get Players With PlayersID
  getPlayerById(playerId: number): Observable<any> {
    return this.http.get(`${environment.SPORTMONKS_BASE}/players/${playerId}?api_token=${environment.SPORTMONKS_API_TOKEN}`);
  }
  // Get Venue With VenueID
  getVenueById(venueId: number): Observable<any> {
    return this.http.get(`${environment.SPORTMONKS_BASE}/venues/${venueId}?api_token=${environment.SPORTMONKS_API_TOKEN}`);
  }

  // Get Team Standing with SeasonID
  getTeamStandings(seasonId: number): Observable<any> {
    return this.http.get(`${environment.SPORTMONKS_BASE}/seasons/${seasonId}/standings?api_token=${environment.SPORTMONKS_API_TOKEN}`);
  }

  // Get Fixture With Team LineUP
  getFixtureWithLineup(fixtureId: number): Observable<any> {
    return this.http.get(`${environment.SPORTMONKS_BASE}/fixtures/${fixtureId}/lineup?api_token=${environment.SPORTMONKS_API_TOKEN}`);
  }

  // Get Fixture with FixtureID with runs
  getFixtureWithRuns(fixtureId: number): Observable<any> {
    return this.http.get(`${environment.SPORTMONKS_BASE}/fixtures/${fixtureId}/runs?api_token=${environment.SPORTMONKS_API_TOKEN}`);
  }

  // Get Teams with TeamsID With Squad based on SeasonID
  getTeamsWithSquad(TEAM_ID: number, SEASON_ID: number): Observable<any> {
    return this.http.get(`${environment.SPORTMONKS_BASE}/teams/${TEAM_ID}/squad/${SEASON_ID}?api_token=${environment.SPORTMONKS_API_TOKEN}`);
  }

}

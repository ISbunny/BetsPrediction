import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({providedIn: 'root'})
export class OddsService {
  constructor(private http: HttpClient) {}

  getUpcoming(): Observable<any> {
    return this.http.get('http://localhost:8000/matches/upcoming');
  }

  getPrediction(matchId: string, marketOdds1?: number, marketOdds2?: number): Observable<any> {
    let params: any = {};
    if (marketOdds1) params.market_odds = marketOdds1;
    if (marketOdds2) params.market_odds2 = marketOdds2;
    return this.http.get(`http://localhost:8000/predict/${matchId}`, { params });
  }

  getSeriesInfo(seriesId: string): Observable<any> {
    return this.http.get(`http://localhost:8000/series/${seriesId}`);
  }

  getFantasyProjection(matchId: string, window: number): Observable<any> {
    return this.http.get(`/api/fantasy/score_projection/${matchId}?window=${window}`);
  }
}

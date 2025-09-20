import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({providedIn: 'root'})
export class OddsService {
  constructor(private http: HttpClient) {}

  getUpcoming(): Observable<any> {
    return this.http.get('http://localhost:8000/matches/upcoming');
  }

  getPrediction(matchId: string): Observable<any> {
    return this.http.get(`http://localhost:8000/predict/${matchId}`);
  }

  getSeriesInfo(seriesId: string): Observable<any> {
    return this.http.get(`http://localhost:8000/series/${seriesId}`);
  }
}

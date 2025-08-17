import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
// import { environment } from './environment'; // Adjust the import path as necessary

@Injectable({
  providedIn: 'root'
})
export class AppService {
   constructor(private http: HttpClient) {}

  getMatchPrediction(matchId: string, apiKey: string): Observable<any> {
    const url = `https://cricbuzz-cricket.p.rapidapi.com/mcenter/v1/${matchId}`;
    const headers = new HttpHeaders({
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com'
    });

    return this.http.get(url, { headers });
  }
  getSeriesInfo(seriesName: string, apiKey: string): Observable<any> {
  const url = `https://cricbuzz-cricket.p.rapidapi.com/series/v1/${seriesName}`;
  const headers = new HttpHeaders({
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com'
  });

  return this.http.get(url, { headers });
}
}

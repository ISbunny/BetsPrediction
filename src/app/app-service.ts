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
getPlaying11TeamA(matchId: string, teamId: string, apiKey: string): Observable<any> {
  const url = `https://cricbuzz-cricket.p.rapidapi.com/mcenter/v1/${matchId}/team/${teamId}`;
  const headers = new HttpHeaders({
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com'
  });

  return this.http.get(url, { headers });
}
getPlaying11TeamB(matchId: string, teamId: string, apiKey: string): Observable<any> {
  const url = `https://cricbuzz-cricket.p.rapidapi.com/mcenter/v1/${matchId}/team/${teamId}`;
  const headers = new HttpHeaders({
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com'
  });

  return this.http.get(url, { headers });
}
 getSeriesSquad(seriesID: string, apiKey: string,squadID: string): Observable<any> {
    const url = `https://cricbuzz-cricket.p.rapidapi.com/series/v1/${seriesID}/squads/${squadID}`;
    const headers = new HttpHeaders({
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com'
    });

    return this.http.get(url, { headers });
  }

  getLiveScore(matchID:number, apiKey: string): Observable<any> {
    const url = `https://cricbuzz-cricket.p.rapidapi.com/mcenter/v1/${matchID}/scard`;
    const headers = new HttpHeaders({
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com'
    });

    return this.http.get(url, { headers });
  }

  // Get Series list archieve
  GetSeriesArchieve(year: number, apiKey: string): Observable<any> {
  const url = `https://cricbuzz-cricket.p.rapidapi.com/series/v1/archives/league`;
  const headers = new HttpHeaders({
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com'
  });
  return this.http.get(url, { 
    headers,
    params: { year: year.toString() }
   });
}
getPlayerBattingStats(playerId: string, apiKey: string) {
  return this.http.get(
    `https://cricbuzz-cricket.p.rapidapi.com/stats/v1/player/${playerId}/batting`,
    {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com',
      },
    }
  );
}

getPlayerBowlingStats(playerId: string, apiKey: string) {
  return this.http.get(
    `https://cricbuzz-cricket.p.rapidapi.com/stats/v1/player/${playerId}/bowling`,
    {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com',
      },
    }
  );
}

// Get Venue Stats
getVenueStats(venueId: string, apiKey: string): Observable<any> {
  const url = `https://cricbuzz-cricket.p.rapidapi.com/stats/v1/venue/${venueId}`;
  const headers = new HttpHeaders({
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com'
  }); 
  return this.http.get(url, { headers });
}
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OddsService } from './odds.service';

@Component({
  selector: 'app-odds',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './odds.component.html',
  styleUrls: ['./odds.component.css']
})
export class OddsComponent implements OnInit {
  matches: any[] = [];
  selectedPrediction: any = null;
  error: any = null;
  seriesId: string = '';
  seriesInfo: any = null;
  loadingSeries = false;
  seriesError: any = null;
  loading = false;

  // Add these:
  marketOdds1: any;
  marketOdds2: any;
  selectedMatch: any = null;

  constructor(private odds: OddsService) {}

  ngOnInit() {
    this.loadMatches();
  }

  loadMatches() {
    this.odds.getUpcoming().subscribe({
      next: (res) => {
        // Flatten all matches from the nested Cricbuzz API structure
        const matches: any[] = [];
        if (res && Array.isArray(res.typeMatches)) {
          for (const typeMatch of res.typeMatches) {
            if (Array.isArray(typeMatch.seriesMatches)) {
              for (const series of typeMatch.seriesMatches) {
                const seriesAdWrapper = series.seriesAdWrapper;
                if (seriesAdWrapper && Array.isArray(seriesAdWrapper.matches)) {
                  matches.push(...seriesAdWrapper.matches);
                }
              }
            }
          }
        }
        this.matches = matches;
      },
      error: (err) => { console.error(err); this.error = err; }
    });
  }

  selectMatch(match: any) {
    this.selectedMatch = match;
    this.marketOdds1 = null;
    this.marketOdds2 = null;
    this.selectedPrediction = null;
  }

  fetchPrediction(match: any) {
    // Debug: log the match object to see its structure
    console.log('Selected match:', match);

    // Try to find the match ID from possible fields
    const id =
      match['id'] ||
      match['matchId'] ||
      match['match_id'] ||
      match['matchIdStr'] ||
      match['idStr'] ||
      (match['matchInfo'] && (match['matchInfo']['matchId'] || match['matchInfo']['id']));

    if (!id) {
      alert('Cannot find match id in selected item (inspect payload)');
      return;
    }
    this.loading = true;
    // Pass market odds to the service
    this.odds.getPrediction(id, this.marketOdds1, this.marketOdds2).subscribe({
      next: (res) => {
        console.log('Prediction response:', res);
        // Attach correct team names for UI display
        const team1Name = match.matchInfo?.team1?.teamName || 'Team 1';
        const team2Name = match.matchInfo?.team2?.teamName || 'Team 2';
        // Model probability for team1
        const prob1 = typeof res.model_prob === 'number' ? res.model_prob : parseFloat(res.model_prob);
        const prob2 = 1 - prob1;
        // Market odds for team2 (if available)
        const marketOdds2 = res.market_odds2 ? (typeof res.market_odds2 === 'number' ? res.market_odds2 : parseFloat(res.market_odds2)) : null;
        // Use 1 / prob2 for fair odds
        const fairOdds2 = prob2 > 0 ? 1 / prob2 : null;
        // If market odds for team2 are not provided, leave as null
        // EV for $1 on team2: (prob2 * (marketOdds2 - 1)) - (prob1 * 1)
        let ev2 = null;
        if (marketOdds2) {
          ev2 = (prob2 * (marketOdds2 - 1)) - (prob1 * 1);
        }
        // Kelly fraction for team2 (scaled 25%)
        let kelly2 = null;
        if (marketOdds2) {
          const k = ((prob2 * (marketOdds2 - 1)) - (prob1)) / (marketOdds2 - 1);
          kelly2 = Math.max(0, k) * 0.25;
        }
        this.selectedPrediction = {
          ...res,
          team1Name,
          team2Name,
          team2_prob: prob2,
          team2_fair_odds: fairOdds2,
          team2_market_odds: marketOdds2,
          team2_ev_for_1: ev2,
          team2_kelly_fraction: kelly2
        };
        this.loading = false;
        this.selectedMatch = null; 
      },
      error: (err) => { console.error(err); this.error = err; this.loading = false; }
    });
  }

  fetchSeriesInfo() {
    if (!this.seriesId) {
      this.seriesError = 'Please enter a series ID.';
      return;
    }
    this.loadingSeries = true;
    this.seriesError = null;
    this.seriesInfo = null;
    this.odds.getSeriesInfo(this.seriesId).subscribe({
      next: (res) => {
        this.seriesInfo = res;
        this.loadingSeries = false;
      },
      error: (err) => {
        this.seriesError = err.message || err;
        this.loadingSeries = false;
      }
    });
  }
}

# Backend (Cricbuzz-enabled)

1. Copy backend/.env.example -> backend/.env and set your RAPIDAPI_KEY
   RAPIDAPI_KEY=your_rapidapi_key_here

2. Install dependencies:
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt

3. Train model (toy synthetic training included):
   python train_model.py

4. Start server:
   python serve_model.py

Endpoints:
- GET /matches/upcoming   -> returns raw Cricbuzz 'upcoming' response
- GET /predict/{match_id} -> returns prediction (probability, odds, EV, Kelly suggestion)

Note: This project uses a synthetic training dataset by default so it's runnable immediately.
Replace training with historical Cricbuzz data collection for better accuracy.

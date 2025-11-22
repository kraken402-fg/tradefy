from fastapi import APIRouter

router = APIRouter()

@router.get("/api/leaderboard")
async def get_leaderboard():
    # Sample leaderboard data
    leaderboard = [
        {"rank": 1, "username": "PEPSY-SKY", "country": "Bénin", "sales": 1422},
        # Add more sample data as needed
    ]
    return leaderboard

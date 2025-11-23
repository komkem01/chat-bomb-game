export interface SoloStats {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  bestScore: number;
  totalScore: number;
  averageScore: number;
  bestTime: number; // in seconds
  totalTime: number; // in seconds
  averageTime: number; // in seconds
  longestCombo: number;
  totalWordsFound: number;
  achievements: string[];
}

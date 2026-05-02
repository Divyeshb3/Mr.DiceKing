import { useState, useCallback, useEffect } from 'react';
import { Player, PlayerColor, GameState } from './types';
import { START_INDICES, HOME_ENTRY_INDICES, isSafeSquare, TRACK_COORDINATES } from './constants';

export function useLudoEngine(initialPlayers: Player[]) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [gameState, setGameState] = useState<GameState>(GameState.WAITING_FOR_ROLL);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [diceValue, setDiceValue] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [movableTokens, setMovableTokens] = useState<number[]>([]);
  const [consecutiveSixes, setConsecutiveSixes] = useState(0);
  const [lastAction, setLastAction] = useState<{ type: 'CAPTURE' | 'FINISHED' | 'NONE', playerId: PlayerColor } | null>(null);

  const activePlayer = players[activePlayerIndex];

  const nextTurn = useCallback(() => {
    setConsecutiveSixes(0);
    setLastAction(null);
    setActivePlayerIndex(prev => (prev + 1) % players.length);
    setGameState(GameState.WAITING_FOR_ROLL);
  }, [players.length]);

  const rollDice = useCallback(() => {
    if (gameState === GameState.GAME_OVER || gameState !== GameState.WAITING_FOR_ROLL || isRolling) return;

    setIsRolling(true);
    setGameState(GameState.ROLLING_DICE);

    setTimeout(() => {
      const newValue = Math.floor(Math.random() * 6) + 1;
      setDiceValue(newValue);
      setIsRolling(false);
      
      const p = players[activePlayerIndex];
      let newConsecutive = newValue === 6 ? consecutiveSixes + 1 : 0;
      
      if (newConsecutive === 3) {
          setConsecutiveSixes(0);
          setMovableTokens([]);
          setGameState(GameState.SWITCHING_TURN);
          setTimeout(() => nextTurn(), 1000);
          return;
      }
      
      setConsecutiveSixes(newConsecutive);

      const possible = p.tokens
        .filter(t => !t.isFinished)
        .filter(t => {
          if (t.position === -1) {
              return newValue === 6;
          }
          if (t.position + newValue > 58) return false;
          return true;
        })
        .map(t => t.id);

      if (possible.length === 0) {
        setMovableTokens([]);
        setGameState(GameState.SWITCHING_TURN);
        setTimeout(() => nextTurn(), 1000);
      } else {
        setMovableTokens(possible);
        setGameState(GameState.WAITING_FOR_MOVE);
      }
    }, 600);
  }, [gameState, isRolling, players, activePlayerIndex, nextTurn, consecutiveSixes]);

  const moveToken = useCallback(async (tokenId: number) => {
    if (gameState !== GameState.WAITING_FOR_MOVE || !movableTokens.includes(tokenId)) return;

    setGameState(GameState.MOVING_TOKEN);
    setMovableTokens([]);

    const steps = diceValue;
    const p = players[activePlayerIndex];
    
    // Step by step animation (Bug #4)
    for (let i = 0; i < steps; i++) {
        await new Promise(resolve => setTimeout(resolve, 120)); // 120ms per step
        
        setPlayers(prev => {
            const nextPlayers = [...prev.map(pl => ({...pl, tokens: pl.tokens.map(t => ({...t}))}))];
            const activePlayerRef = nextPlayers[activePlayerIndex];
            const t = activePlayerRef.tokens.find(tk => tk.id === tokenId)!;
            
            if (t.position === -1) {
                t.position = 0; 
                return nextPlayers;
            } else {
                t.position++;
                if (t.position === 57) {
                    // Logic for finish will be handled after loop
                }
            }
            return nextPlayers;
        });

        if (p.tokens.find(t => t.id === tokenId)!.position === -1 && i === 0) {
            // Already handled in first iteration
            break;
        }
    }

    // Final calculations (Capture & Turn)
    setPlayers(prev => {
        const nextPlayers = [...prev.map(pl => ({...pl, tokens: pl.tokens.map(t => ({...t}))}))];
        const activePlayerRef = nextPlayers[activePlayerIndex];
        const t = activePlayerRef.tokens.find(tk => tk.id === tokenId)!;

        if (t.position === 58) {
            t.isFinished = true;
        }

        let hasCaptured = false;
        if (!t.isFinished && t.position < 52) {
            const myAbsPos = (START_INDICES[activePlayerRef.id] + t.position) % 52;
            const [myRow, myCol] = TRACK_COORDINATES[myAbsPos];
            
            if (!isSafeSquare(myRow, myCol)) {
                nextPlayers.forEach((otherP, pIdx) => {
                    if (pIdx === activePlayerIndex) return;
                    
                    otherP.tokens.forEach(otherT => {
                        if (otherT.position >= 0 && otherT.position < 52) {
                            const otherAbsPos = (START_INDICES[otherP.id] + otherT.position) % 52;
                            if (otherAbsPos === myAbsPos) {
                                otherT.position = -1; 
                                hasCaptured = true;
                            }
                        }
                    });
                });
            }
        }

        const allFinished = activePlayerRef.tokens.every(tk => tk.isFinished);
        
        if (allFinished) {
            setGameState(GameState.GAME_OVER);
        } else if (hasCaptured || t.isFinished || diceValue === 6) {
            if (hasCaptured) setLastAction({ type: 'CAPTURE', playerId: activePlayerRef.id });
            if (t.isFinished && !hasCaptured) setLastAction({ type: 'FINISHED', playerId: activePlayerRef.id });
            setGameState(GameState.WAITING_FOR_ROLL);
        } else {
            setGameState(GameState.SWITCHING_TURN);
            setTimeout(() => nextTurn(), 400);
        }

        return nextPlayers;
    });

  }, [gameState, movableTokens, players, activePlayerIndex, diceValue, nextTurn]);

  useEffect(() => {
    if (gameState === GameState.WAITING_FOR_ROLL && activePlayer.type === 'AI') {
      const timer = setTimeout(() => rollDice(), 800);
      return () => clearTimeout(timer);
    }

    if (gameState === GameState.WAITING_FOR_MOVE && activePlayer.type === 'AI' && movableTokens.length > 0) {
      const timer = setTimeout(() => {
          // AI Logic Priorties:
          // 1. Finish
          // 2. Capture
          // 3. Bring out (if 6 rolled)
          // 4. Furthest token
          
          let bestTokenId = movableTokens[0];
          let maxScore = -1;

          movableTokens.forEach(id => {
              const token = activePlayer.tokens.find(t => t.id === id)!;
              let score = 0;

              if (token.position === -1) {
                  score += 300; // Priority 3: Bring out
              } else {
                  score += token.position; // Priority 4: Furthest token
                  
                  // Check for potential capture
                  players.forEach((p, pIdx) => {
                      if (pIdx === activePlayerIndex) return;
                      p.tokens.forEach(otherT => {
                          const futureSteps = token.position + diceValue;
                          if (futureSteps < 52) {
                              const myFutureAbs = (START_INDICES[activePlayer.id] + futureSteps) % 52;
                              const otherAbs = (otherT.position >= 0 && otherT.position < 52) 
                                ? (START_INDICES[p.id] + otherT.position) % 52 
                                : -1;
                              if (myFutureAbs === otherAbs && !isSafeSquare(TRACK_COORDINATES[myFutureAbs][0], TRACK_COORDINATES[myFutureAbs][1])) {
                                  score += 500; // Priority 2: Capture
                              }
                          }
                      });
                  });

                  if (token.position + diceValue === 58) {
                      score += 1000; // Priority 1: Finish Piece
                  } else if (token.position + diceValue >= 52) {
                      score += 100; // Nice to enter home column
                  }
              }

              if (score > maxScore) {
                  maxScore = score;
                  bestTokenId = id;
              }
          });

          moveToken(bestTokenId);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState, activePlayer, rollDice, moveToken, movableTokens]);

  return {
    players,
    activePlayerIndex,
    gameState,
    diceValue,
    isRolling,
    movableTokens,
    rollDice,
    moveToken,
    consecutiveSixes,
    lastAction
  };
}
